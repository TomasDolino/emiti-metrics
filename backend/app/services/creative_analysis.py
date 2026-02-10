"""
Creative Analysis Service for Emiti Metrics
Analyzes creatives and compares them with historical performance data.
All recommendations are based on REAL data, not opinions.
"""

import os
import json
import base64
import httpx
import hashlib
from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from ..database import CreativeDB, MetricDB, ClientDB

# Configuration
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_VISION_MODEL = "claude-sonnet-4-20250514"


# ==================== ATTRIBUTE EXTRACTION PROMPT ====================

CREATIVE_ATTRIBUTES_PROMPT = """Eres un experto en analisis de creativos publicitarios para Meta Ads.

Analiza esta imagen y extrae TODOS los siguientes atributos. Responde SOLO con JSON valido.

{
  "photography": {
    "photo_type": "product_only|lifestyle|ambiente|detail|before_after",
    "photo_angle": "frontal|45deg|cenital|contrapicado|eye_level",
    "photo_distance": "closeup|medio|full|wide",
    "background_type": "white|gray|solid_color|lifestyle|exterior|texture",
    "lighting": "natural_soft|natural_hard|studio|warm|cold|dramatic",
    "shadows": "none|soft|defined|dramatic",
    "depth_of_field": "blurred_bg|all_focused",
    "image_quality": "high|medium|low"
  },
  "composition": {
    "rule_of_thirds": true|false,
    "focal_point": "clear|multiple|diffuse",
    "negative_space": "0-20|20-40|40-60|60+",
    "visual_direction": "to_cta|outward|neutral",
    "symmetry": "symmetric|asymmetric_balanced|unbalanced",
    "contrast_level": "high|medium|low",
    "color_palette": "monochromatic|complementary|analogous|triadic",
    "dominant_color": "#hexcolor",
    "product_count": "1|2-3|4-6|catalog",
    "has_props": "none|minimal|moderate|abundant",
    "has_scale_reference": "person|object|none"
  },
  "human_elements": {
    "has_person": true|false,
    "person_type": "model|ugc|influencer|testimonial|null",
    "person_visibility": "hands|partial|full_body|null",
    "person_expression": "smile|neutral|serious|using_product|null",
    "person_gaze": "to_camera|to_product|away|null",
    "person_interaction": "using|touching|pointing|posing|null"
  },
  "commercial_info": {
    "has_price": true|false,
    "price_prominence": "small|prominent|null",
    "has_discount": true|false,
    "discount_type": "percentage|fixed|2x1|installments|null",
    "discount_magnitude": "<20|20-40|40-60|>60|null",
    "has_urgency": true|false,
    "urgency_type": "today|this_week|last_days|null",
    "has_scarcity": true|false,
    "has_shipping_info": true|false,
    "shipping_type": "free|paid|null",
    "has_guarantee": true|false,
    "logo_visibility": "none|subtle|prominent",
    "has_badge": true|false,
    "badge_type": "new|bestseller|exclusive|null"
  },
  "copy_text": {
    "has_text_overlay": true|false,
    "text_amount": "none|1-5words|6-15|16+",
    "text_position": "top|center|bottom|overlay|null",
    "font_type": "sans_serif|serif|script|display|null",
    "text_contrast": "high|medium|low|null",
    "headline_type": "benefit|price|emotion|question|product_name|null",
    "has_subheadline": true|false,
    "cta_text": "comprar|ver_mas|whatsapp|cotizar|descubrir|none",
    "has_emojis": true|false,
    "detected_copy": "texto exacto detectado en la imagen"
  },
  "product_info": {
    "product_category": "silla|mesa|sofa|cama|decoracion|iluminacion|exterior|otro",
    "product_material": "madera|tela|metal|vidrio|mixto|no_visible",
    "product_style": "modern|classic|rustic|minimalist|industrial|bohemian",
    "price_range": "economico|medio|premium"
  },
  "format": {
    "aspect_ratio": "1:1|4:5|9:16|16:9|otro",
    "media_type": "image|carousel_slide|video_thumbnail"
  }
}

IMPORTANTE:
- Usa null si un atributo no aplica
- Detecta el copy EXACTO que aparece en la imagen
- Analiza objetivamente, sin inventar
- Si no puedes determinar algo con certeza, usa el valor mas probable
"""


async def extract_creative_attributes(
    image_data: str | bytes,
    image_type: str = "image/jpeg"
) -> Dict:
    """
    Extract all attributes from a creative image using Claude Vision.
    Returns structured attributes for comparison.
    """
    if not ANTHROPIC_API_KEY:
        return {"error": "ANTHROPIC_API_KEY not configured"}

    # Convert bytes to base64 if needed
    if isinstance(image_data, bytes):
        image_b64 = base64.b64encode(image_data).decode("utf-8")
    else:
        image_b64 = image_data

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

    payload = {
        "model": CLAUDE_VISION_MODEL,
        "max_tokens": 2000,
        "messages": [{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": image_type,
                        "data": image_b64
                    }
                },
                {
                    "type": "text",
                    "text": CREATIVE_ATTRIBUTES_PROMPT
                }
            ]
        }]
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=payload
            )

            if response.status_code != 200:
                return {"error": f"API error: {response.status_code}", "details": response.text}

            result = response.json()
            content = result.get("content", [{}])[0].get("text", "{}")

            # Parse JSON from response
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                attributes = json.loads(json_match.group())
                return {
                    "success": True,
                    "attributes": attributes,
                    "usage": result.get("usage", {})
                }
            else:
                return {"error": "Could not parse attributes from response", "raw": content}

    except json.JSONDecodeError as e:
        return {"error": f"JSON parse error: {str(e)}"}
    except Exception as e:
        return {"error": str(e)}


def flatten_attributes(attributes: Dict) -> Dict:
    """Flatten nested attributes dict into database columns."""
    flat = {}

    # Photography
    photo = attributes.get("photography", {})
    flat["photo_type"] = photo.get("photo_type")
    flat["photo_angle"] = photo.get("photo_angle")
    flat["photo_distance"] = photo.get("photo_distance")
    flat["background_type"] = photo.get("background_type")
    flat["lighting"] = photo.get("lighting")
    flat["shadows"] = photo.get("shadows")
    flat["depth_of_field"] = photo.get("depth_of_field")
    flat["image_quality"] = photo.get("image_quality")

    # Composition
    comp = attributes.get("composition", {})
    flat["rule_of_thirds"] = comp.get("rule_of_thirds")
    flat["focal_point"] = comp.get("focal_point")
    flat["negative_space"] = comp.get("negative_space")
    flat["visual_direction"] = comp.get("visual_direction")
    flat["symmetry"] = comp.get("symmetry")
    flat["contrast_level"] = comp.get("contrast_level")
    flat["color_palette"] = comp.get("color_palette")
    flat["dominant_color"] = comp.get("dominant_color")
    flat["product_count"] = comp.get("product_count")
    flat["has_props"] = comp.get("has_props")
    flat["has_scale_reference"] = comp.get("has_scale_reference")

    # Human elements
    human = attributes.get("human_elements", {})
    flat["has_person"] = human.get("has_person")
    flat["person_type"] = human.get("person_type")
    flat["person_visibility"] = human.get("person_visibility")
    flat["person_expression"] = human.get("person_expression")
    flat["person_gaze"] = human.get("person_gaze")
    flat["person_interaction"] = human.get("person_interaction")

    # Commercial info
    comm = attributes.get("commercial_info", {})
    flat["has_price"] = comm.get("has_price")
    flat["price_prominence"] = comm.get("price_prominence")
    flat["has_discount"] = comm.get("has_discount")
    flat["discount_type"] = comm.get("discount_type")
    flat["discount_magnitude"] = comm.get("discount_magnitude")
    flat["has_urgency"] = comm.get("has_urgency")
    flat["urgency_type"] = comm.get("urgency_type")
    flat["has_scarcity"] = comm.get("has_scarcity")
    flat["has_shipping_info"] = comm.get("has_shipping_info")
    flat["shipping_type"] = comm.get("shipping_type")
    flat["has_guarantee"] = comm.get("has_guarantee")
    flat["logo_visibility"] = comm.get("logo_visibility")
    flat["has_badge"] = comm.get("has_badge")
    flat["badge_type"] = comm.get("badge_type")

    # Copy/Text
    copy = attributes.get("copy_text", {})
    flat["has_text_overlay"] = copy.get("has_text_overlay")
    flat["text_amount"] = copy.get("text_amount")
    flat["text_position"] = copy.get("text_position")
    flat["font_type"] = copy.get("font_type")
    flat["text_contrast"] = copy.get("text_contrast")
    flat["headline_type"] = copy.get("headline_type")
    flat["has_subheadline"] = copy.get("has_subheadline")
    flat["cta_text"] = copy.get("cta_text")
    flat["has_emojis"] = copy.get("has_emojis")
    flat["detected_copy"] = copy.get("detected_copy")

    # Product info
    prod = attributes.get("product_info", {})
    flat["product_category"] = prod.get("product_category")
    flat["product_material"] = prod.get("product_material")
    flat["product_style"] = prod.get("product_style")
    flat["price_range"] = prod.get("price_range")

    # Format
    fmt = attributes.get("format", {})
    flat["aspect_ratio"] = fmt.get("aspect_ratio")
    flat["media_type"] = fmt.get("media_type")

    return flat


def calculate_similarity_score(new_attrs: Dict, reference_attrs: Dict) -> float:
    """
    Calculate similarity score between two creatives based on attributes.
    Returns a percentage (0-100).
    """
    comparable_fields = [
        "photo_type", "photo_angle", "background_type", "lighting",
        "has_person", "has_price", "has_discount", "has_urgency",
        "product_category", "product_material", "aspect_ratio",
        "cta_text", "headline_type", "contrast_level"
    ]

    matches = 0
    total = 0

    for field in comparable_fields:
        new_val = new_attrs.get(field)
        ref_val = reference_attrs.get(field)

        if new_val is not None and ref_val is not None:
            total += 1
            if new_val == ref_val:
                matches += 1

    if total == 0:
        return 0

    return round((matches / total) * 100, 1)


def find_similar_creatives(
    db: Session,
    attributes: Dict,
    client_id: Optional[str] = None,
    limit: int = 5,
    min_results: int = 1
) -> List[Dict]:
    """
    Find similar creatives in the database based on attributes.
    Prioritizes creatives with good performance (high CTR, low CPR).
    """
    query = db.query(CreativeDB).filter(
        CreativeDB.ctr.isnot(None),
        CreativeDB.results >= min_results
    )

    # Filter by product category if available
    if attributes.get("product_category"):
        query = query.filter(
            CreativeDB.product_category == attributes["product_category"]
        )

    # Order by performance (CTR desc, CPR asc)
    query = query.order_by(
        CreativeDB.ctr.desc(),
        CreativeDB.cpr.asc()
    )

    similar = []
    for creative in query.limit(50).all():
        ref_attrs = {
            "photo_type": creative.photo_type,
            "photo_angle": creative.photo_angle,
            "background_type": creative.background_type,
            "lighting": creative.lighting,
            "has_person": creative.has_person,
            "has_price": creative.has_price,
            "has_discount": creative.has_discount,
            "has_urgency": creative.has_urgency,
            "product_category": creative.product_category,
            "product_material": creative.product_material,
            "aspect_ratio": creative.aspect_ratio,
            "cta_text": creative.cta_text,
            "headline_type": creative.headline_type,
            "contrast_level": creative.contrast_level,
        }

        similarity = calculate_similarity_score(attributes, ref_attrs)

        if similarity > 30:  # Minimum 30% similarity
            similar.append({
                "id": creative.id,
                "ad_name": creative.ad_name,
                "client_id": creative.client_id,
                "image_url": creative.image_url,
                "similarity_score": similarity,
                "metrics": {
                    "ctr": creative.ctr,
                    "cpc": creative.cpc,
                    "cpm": creative.cpm,
                    "cpr": creative.cpr,
                    "results": creative.results,
                    "spend": creative.spend,
                    "impressions": creative.impressions
                },
                "attributes": ref_attrs
            })

    # Sort by similarity and return top N
    similar.sort(key=lambda x: (-x["similarity_score"], -x["metrics"]["ctr"]))
    return similar[:limit]


def find_top_performers(
    db: Session,
    product_category: Optional[str] = None,
    limit: int = 5
) -> List[Dict]:
    """
    Find top performing creatives, optionally filtered by category.
    """
    query = db.query(CreativeDB).filter(
        CreativeDB.ctr.isnot(None),
        CreativeDB.results >= 5  # Minimum results for statistical significance
    )

    if product_category:
        query = query.filter(CreativeDB.product_category == product_category)

    # Order by CTR descending
    query = query.order_by(CreativeDB.ctr.desc())

    top = []
    for creative in query.limit(limit).all():
        top.append({
            "id": creative.id,
            "ad_name": creative.ad_name,
            "client_id": creative.client_id,
            "image_url": creative.image_url,
            "metrics": {
                "ctr": creative.ctr,
                "cpc": creative.cpc,
                "cpm": creative.cpm,
                "cpr": creative.cpr,
                "results": creative.results,
                "spend": creative.spend
            },
            "attributes": {
                "photo_type": creative.photo_type,
                "photo_angle": creative.photo_angle,
                "background_type": creative.background_type,
                "has_person": creative.has_person,
                "has_price": creative.has_price,
                "has_discount": creative.has_discount,
                "cta_text": creative.cta_text,
                "detected_copy": creative.detected_copy
            }
        })

    return top


def generate_attribute_insights(
    db: Session,
    product_category: Optional[str] = None
) -> Dict:
    """
    Generate insights about what attributes correlate with better performance.
    Based on REAL data from the database.
    """
    query = db.query(CreativeDB).filter(
        CreativeDB.ctr.isnot(None),
        CreativeDB.results >= 3
    )

    if product_category:
        query = query.filter(CreativeDB.product_category == product_category)

    creatives = query.all()

    if len(creatives) < 10:
        return {
            "has_data": False,
            "message": f"Necesitas al menos 10 creativos analizados para generar insights. Actualmente hay {len(creatives)}.",
            "count": len(creatives)
        }

    insights = []

    # Analyze has_price impact
    with_price = [c for c in creatives if c.has_price]
    without_price = [c for c in creatives if not c.has_price]

    if with_price and without_price:
        avg_ctr_with = sum(c.ctr for c in with_price) / len(with_price)
        avg_ctr_without = sum(c.ctr for c in without_price) / len(without_price)
        diff = ((avg_ctr_with - avg_ctr_without) / avg_ctr_without) * 100 if avg_ctr_without > 0 else 0

        if abs(diff) > 10:
            insights.append({
                "attribute": "has_price",
                "insight": f"Precio visible: {'+'if diff > 0 else ''}{diff:.0f}% CTR",
                "recommendation": "Mostrar precio" if diff > 0 else "Ocultar precio",
                "sample_size": len(with_price) + len(without_price),
                "impact": "high" if abs(diff) > 25 else "medium"
            })

    # Analyze has_person impact
    with_person = [c for c in creatives if c.has_person]
    without_person = [c for c in creatives if not c.has_person]

    if with_person and without_person:
        avg_ctr_with = sum(c.ctr for c in with_person) / len(with_person)
        avg_ctr_without = sum(c.ctr for c in without_person) / len(without_person)
        diff = ((avg_ctr_with - avg_ctr_without) / avg_ctr_without) * 100 if avg_ctr_without > 0 else 0

        if abs(diff) > 10:
            insights.append({
                "attribute": "has_person",
                "insight": f"Con persona: {'+'if diff > 0 else ''}{diff:.0f}% CTR",
                "recommendation": "Incluir persona" if diff > 0 else "Producto solo",
                "sample_size": len(with_person) + len(without_person),
                "impact": "high" if abs(diff) > 25 else "medium"
            })

    # Analyze has_discount impact
    with_discount = [c for c in creatives if c.has_discount]
    without_discount = [c for c in creatives if not c.has_discount]

    if with_discount and without_discount:
        avg_ctr_with = sum(c.ctr for c in with_discount) / len(with_discount)
        avg_ctr_without = sum(c.ctr for c in without_discount) / len(without_discount)
        diff = ((avg_ctr_with - avg_ctr_without) / avg_ctr_without) * 100 if avg_ctr_without > 0 else 0

        if abs(diff) > 10:
            insights.append({
                "attribute": "has_discount",
                "insight": f"Con descuento: {'+'if diff > 0 else ''}{diff:.0f}% CTR",
                "recommendation": "Mostrar descuento" if diff > 0 else "Sin descuento",
                "sample_size": len(with_discount) + len(without_discount),
                "impact": "high" if abs(diff) > 25 else "medium"
            })

    # Analyze photo_angle impact
    angle_groups = {}
    for c in creatives:
        if c.photo_angle:
            if c.photo_angle not in angle_groups:
                angle_groups[c.photo_angle] = []
            angle_groups[c.photo_angle].append(c.ctr)

    if len(angle_groups) >= 2:
        angle_avgs = {k: sum(v)/len(v) for k, v in angle_groups.items() if len(v) >= 3}
        if angle_avgs:
            best_angle = max(angle_avgs, key=angle_avgs.get)
            worst_angle = min(angle_avgs, key=angle_avgs.get)
            if best_angle != worst_angle:
                diff = ((angle_avgs[best_angle] - angle_avgs[worst_angle]) / angle_avgs[worst_angle]) * 100
                insights.append({
                    "attribute": "photo_angle",
                    "insight": f"Angulo {best_angle}: +{diff:.0f}% CTR vs {worst_angle}",
                    "recommendation": f"Usar angulo {best_angle}",
                    "sample_size": sum(len(v) for v in angle_groups.values()),
                    "impact": "medium"
                })

    # Analyze CTA impact
    cta_groups = {}
    for c in creatives:
        if c.cta_text:
            if c.cta_text not in cta_groups:
                cta_groups[c.cta_text] = []
            cta_groups[c.cta_text].append(c.ctr)

    if len(cta_groups) >= 2:
        cta_avgs = {k: sum(v)/len(v) for k, v in cta_groups.items() if len(v) >= 3}
        if cta_avgs:
            best_cta = max(cta_avgs, key=cta_avgs.get)
            insights.append({
                "attribute": "cta_text",
                "insight": f"Mejor CTA: '{best_cta}' (CTR: {cta_avgs[best_cta]:.2f}%)",
                "recommendation": f"Usar CTA '{best_cta}'",
                "sample_size": sum(len(v) for v in cta_groups.values()),
                "impact": "medium"
            })

    return {
        "has_data": True,
        "total_creatives": len(creatives),
        "insights": insights,
        "generated_at": datetime.utcnow().isoformat()
    }


def compare_with_references(
    new_attributes: Dict,
    references: List[Dict]
) -> Dict:
    """
    Compare new creative attributes with reference creatives.
    Returns detailed comparison with matches and differences.
    """
    if not references:
        return {
            "has_references": False,
            "message": "No hay creativos de referencia disponibles"
        }

    all_matches = []
    all_differences = []

    # Compare with top reference
    top_ref = references[0]
    ref_attrs = top_ref.get("attributes", {})

    comparison_fields = {
        "has_price": "Precio visible",
        "has_discount": "Descuento",
        "has_person": "Persona",
        "has_urgency": "Urgencia",
        "photo_angle": "Angulo de foto",
        "background_type": "Tipo de fondo",
        "lighting": "Iluminacion",
        "cta_text": "CTA",
        "has_props": "Props/decoracion",
        "product_material": "Material visible",
        "has_text_overlay": "Texto en imagen",
        "headline_type": "Tipo de headline",
        "logo_visibility": "Logo visible"
    }

    for field, label in comparison_fields.items():
        new_val = new_attributes.get(field)
        ref_val = ref_attrs.get(field)

        if new_val is not None and ref_val is not None:
            if new_val == ref_val:
                all_matches.append({
                    "field": field,
                    "label": label,
                    "value": new_val
                })
            else:
                all_differences.append({
                    "field": field,
                    "label": label,
                    "your_value": new_val,
                    "top_performer_value": ref_val
                })

    # Calculate overall match score
    total_compared = len(all_matches) + len(all_differences)
    match_score = round((len(all_matches) / total_compared) * 100, 1) if total_compared > 0 else 0

    return {
        "has_references": True,
        "match_score": match_score,
        "matches": all_matches,
        "differences": all_differences,
        "top_reference": {
            "ad_name": top_ref.get("ad_name"),
            "metrics": top_ref.get("metrics"),
            "image_url": top_ref.get("image_url")
        },
        "all_references": references
    }


async def analyze_and_compare_creative(
    db: Session,
    image_data: str | bytes,
    image_type: str = "image/jpeg",
    copy_text: Optional[str] = None,
    client_id: Optional[str] = None
) -> Dict:
    """
    Complete creative analysis: extract attributes, find similar creatives,
    compare with top performers, and generate recommendations.
    """
    # Step 1: Extract attributes from new creative
    extraction_result = await extract_creative_attributes(image_data, image_type)

    if "error" in extraction_result:
        return extraction_result

    attributes = extraction_result.get("attributes", {})
    flat_attributes = flatten_attributes(attributes)

    # Step 2: Find similar creatives in DB
    similar = find_similar_creatives(
        db,
        flat_attributes,
        client_id=client_id,
        limit=5
    )

    # Step 3: Find top performers in same category
    product_category = flat_attributes.get("product_category")
    top_performers = find_top_performers(db, product_category, limit=3)

    # Step 4: Generate comparison
    comparison = compare_with_references(flat_attributes, top_performers)

    # Step 5: Generate insights based on data
    insights = generate_attribute_insights(db, product_category)

    # Step 6: Generate recommendations based on differences
    recommendations = []
    for diff in comparison.get("differences", [])[:5]:
        # Check if this attribute correlates with better performance
        for insight in insights.get("insights", []):
            if insight["attribute"] == diff["field"]:
                recommendations.append({
                    "priority": "high" if insight["impact"] == "high" else "medium",
                    "change": f"{diff['label']}: '{diff['your_value']}' → '{diff['top_performer_value']}'",
                    "expected_impact": insight["insight"],
                    "based_on": f"{insight['sample_size']} creativos analizados"
                })
                break

    return {
        "success": True,
        "analysis": {
            "attributes": attributes,
            "flat_attributes": flat_attributes
        },
        "similar_creatives": similar,
        "top_performers": top_performers,
        "comparison": comparison,
        "insights": insights,
        "recommendations": recommendations,
        "data_quality": {
            "total_creatives_in_db": len(similar) + len(top_performers),
            "has_enough_data": insights.get("has_data", False),
            "confidence": "high" if insights.get("total_creatives", 0) > 50 else "medium" if insights.get("total_creatives", 0) > 20 else "low"
        }
    }


async def search_seo_keywords(query: str) -> Dict:
    """
    Search for SEO keywords and trends related to a product.
    Uses web search to get real data.
    """
    # This will be called from the router which has access to web search
    # For now, return a placeholder structure
    return {
        "query": query,
        "note": "SEO search requires web access - implemented in router"
    }


def get_creative_stats(db: Session, client_id: Optional[str] = None) -> Dict:
    """
    Get statistics about creatives in the database.
    """
    query = db.query(CreativeDB)

    if client_id:
        query = query.filter(CreativeDB.client_id == client_id)

    total = query.count()
    analyzed = query.filter(CreativeDB.analyzed_at.isnot(None)).count()
    with_metrics = query.filter(CreativeDB.ctr.isnot(None)).count()

    # Categories breakdown
    categories = db.query(
        CreativeDB.product_category,
        func.count(CreativeDB.id)
    ).group_by(CreativeDB.product_category).all()

    return {
        "total_creatives": total,
        "analyzed": analyzed,
        "with_metrics": with_metrics,
        "categories": {cat: count for cat, count in categories if cat},
        "ready_for_comparison": with_metrics >= 10
    }
