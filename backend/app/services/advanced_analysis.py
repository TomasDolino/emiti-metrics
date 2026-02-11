"""
Servicio de análisis avanzado - EXPANSIONES
Pattern Mining, Simulador de Escenarios, Diagnóstico de Estructura, etc.
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from collections import Counter
import re

from ..models.schemas import CampaignObjective


# ==================== PATTERN MINING ====================

def extract_ad_metadata(ad_name: str) -> Dict:
    """
    Extrae metadata del nombre del anuncio usando patrones comunes.
    Ejemplo: "Video_Testimonial_ZonaNorte_v2" → {format: video, type: testimonial, ...}
    """
    name_lower = ad_name.lower()

    metadata = {
        'format': 'unknown',
        'type': 'unknown',
        'has_emoji': bool(re.search(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF]', ad_name)),
        'has_promo': any(word in name_lower for word in ['promo', '2x1', 'descuento', 'oferta', '%off']),
        'has_testimonial': 'testimon' in name_lower,
        'has_version': bool(re.search(r'v\d+|version|ver\d+', name_lower)),
        'word_count': len(ad_name.split()),
    }

    # Detect format
    if any(word in name_lower for word in ['video', 'vid', 'reel']):
        metadata['format'] = 'video'
    elif any(word in name_lower for word in ['carrusel', 'carousel', 'carr']):
        metadata['format'] = 'carousel'
    elif any(word in name_lower for word in ['dpa', 'dinamico', 'catalogo']):
        metadata['format'] = 'dpa'
    elif any(word in name_lower for word in ['imagen', 'image', 'img', 'foto']):
        metadata['format'] = 'image'
    elif any(word in name_lower for word in ['story', 'stories']):
        metadata['format'] = 'story'

    # Detect type
    if metadata['has_testimonial']:
        metadata['type'] = 'testimonial'
    elif metadata['has_promo']:
        metadata['type'] = 'promotional'
    elif any(word in name_lower for word in ['producto', 'product']):
        metadata['type'] = 'product'
    elif any(word in name_lower for word in ['brand', 'marca', 'awareness']):
        metadata['type'] = 'branding'

    return metadata


def mine_patterns(df: pd.DataFrame) -> List[Dict]:
    """
    Detecta patrones en los datos que correlacionan con mejor performance.
    """
    patterns = []

    if len(df) < 10:
        return patterns

    # Agregar metadata a cada fila
    df = df.copy()
    df['metadata'] = df['ad_name'].apply(extract_ad_metadata)

    # Pattern 1: Format performance
    format_stats = {}
    for _, row in df.iterrows():
        fmt = row['metadata']['format']
        if fmt not in format_stats:
            format_stats[fmt] = {'spend': 0, 'results': 0, 'count': 0}
        format_stats[fmt]['spend'] += row['spend']
        format_stats[fmt]['results'] += row['results']
        format_stats[fmt]['count'] += 1

    for fmt, stats in format_stats.items():
        if stats['count'] >= 5 and stats['results'] > 0:
            cpr = stats['spend'] / stats['results']
            format_stats[fmt]['cpr'] = cpr

    if len(format_stats) >= 2:
        sorted_formats = sorted(
            [(f, s) for f, s in format_stats.items() if 'cpr' in s],
            key=lambda x: x[1]['cpr']
        )
        if sorted_formats:
            best_format = sorted_formats[0]
            worst_format = sorted_formats[-1]
            if best_format[1]['cpr'] < worst_format[1]['cpr'] * 0.8:
                improvement = ((worst_format[1]['cpr'] - best_format[1]['cpr']) / worst_format[1]['cpr']) * 100
                patterns.append({
                    'pattern': f'{best_format[0].title()} supera a {worst_format[0].title()}',
                    'impact': f'{improvement:.0f}% menor CPR',
                    'confidence': 'high' if best_format[1]['count'] >= 10 else 'medium',
                    'category': 'format',
                    'recommendation': f'Priorizar formato {best_format[0]}'
                })

    # Pattern 2: Emoji impact
    with_emoji = df[df['metadata'].apply(lambda x: x['has_emoji'])]
    without_emoji = df[df['metadata'].apply(lambda x: not x['has_emoji'])]

    if len(with_emoji) >= 5 and len(without_emoji) >= 5:
        cpr_emoji = with_emoji['spend'].sum() / with_emoji['results'].sum() if with_emoji['results'].sum() > 0 else 0
        cpr_no_emoji = without_emoji['spend'].sum() / without_emoji['results'].sum() if without_emoji['results'].sum() > 0 else 0

        if cpr_emoji > 0 and cpr_no_emoji > 0:
            if cpr_emoji < cpr_no_emoji * 0.85:
                improvement = ((cpr_no_emoji - cpr_emoji) / cpr_no_emoji) * 100
                patterns.append({
                    'pattern': 'Anuncios con emoji tienen mejor performance',
                    'impact': f'{improvement:.0f}% menor CPR',
                    'confidence': 'medium',
                    'category': 'creative',
                    'recommendation': 'Incluir emojis en títulos de anuncios'
                })
            elif cpr_no_emoji < cpr_emoji * 0.85:
                improvement = ((cpr_emoji - cpr_no_emoji) / cpr_emoji) * 100
                patterns.append({
                    'pattern': 'Anuncios sin emoji tienen mejor performance',
                    'impact': f'{improvement:.0f}% menor CPR',
                    'confidence': 'medium',
                    'category': 'creative',
                    'recommendation': 'Evitar emojis en títulos de anuncios'
                })

    # Pattern 3: Promotional vs non-promotional
    promo = df[df['metadata'].apply(lambda x: x['has_promo'])]
    non_promo = df[df['metadata'].apply(lambda x: not x['has_promo'])]

    if len(promo) >= 3 and len(non_promo) >= 3:
        cpr_promo = promo['spend'].sum() / promo['results'].sum() if promo['results'].sum() > 0 else 0
        cpr_non = non_promo['spend'].sum() / non_promo['results'].sum() if non_promo['results'].sum() > 0 else 0

        if cpr_promo > 0 and cpr_non > 0 and cpr_promo < cpr_non * 0.8:
            improvement = ((cpr_non - cpr_promo) / cpr_non) * 100
            patterns.append({
                'pattern': 'Promociones convierten mejor que contenido orgánico',
                'impact': f'{improvement:.0f}% menor CPR',
                'confidence': 'high' if len(promo) >= 10 else 'medium',
                'category': 'messaging',
                'recommendation': 'Incorporar más contenido promocional'
            })

    # Pattern 4: Day of week analysis
    df['day_of_week'] = pd.to_datetime(df['date']).dt.dayofweek
    day_names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

    day_stats = df.groupby('day_of_week').agg({
        'spend': 'sum',
        'results': 'sum'
    }).reset_index()

    day_stats['cpr'] = day_stats.apply(
        lambda r: r['spend'] / r['results'] if r['results'] > 0 else 999999,
        axis=1
    )

    best_day = day_stats.loc[day_stats['cpr'].idxmin()]
    worst_day = day_stats.loc[day_stats['cpr'].idxmax()]

    if best_day['cpr'] < worst_day['cpr'] * 0.7 and best_day['cpr'] < 999999:
        patterns.append({
            'pattern': f'{day_names[int(best_day["day_of_week"])]} es el mejor día para conversiones',
            'impact': f'CPR ${best_day["cpr"]:.0f} vs ${worst_day["cpr"]:.0f}',
            'confidence': 'medium',
            'category': 'timing',
            'recommendation': f'Concentrar presupuesto en {day_names[int(best_day["day_of_week"])]}'
        })

    # Pattern 5: Testimonials performance
    testimonials = df[df['metadata'].apply(lambda x: x['has_testimonial'])]
    non_testimonials = df[df['metadata'].apply(lambda x: not x['has_testimonial'])]

    if len(testimonials) >= 3 and len(non_testimonials) >= 3:
        cpr_test = testimonials['spend'].sum() / testimonials['results'].sum() if testimonials['results'].sum() > 0 else 0
        cpr_non = non_testimonials['spend'].sum() / non_testimonials['results'].sum() if non_testimonials['results'].sum() > 0 else 0

        if cpr_test > 0 and cpr_non > 0 and cpr_test < cpr_non * 0.85:
            improvement = ((cpr_non - cpr_test) / cpr_non) * 100
            patterns.append({
                'pattern': 'Testimoniales generan más confianza',
                'impact': f'{improvement:.0f}% menor CPR',
                'confidence': 'high',
                'category': 'creative',
                'recommendation': 'Crear más contenido con testimoniales de clientes'
            })

    return patterns


# ==================== SCENARIO SIMULATOR ====================

def simulate_budget_change(
    df: pd.DataFrame,
    change_percent: float,
    target_ads: Optional[List[str]] = None
) -> Dict:
    """
    Simula qué pasaría si se cambia el presupuesto.

    Args:
        df: DataFrame con métricas históricas
        change_percent: Porcentaje de cambio (+30 = aumentar 30%, -20 = reducir 20%)
        target_ads: Lista de anuncios a afectar (None = todos)
    """
    if target_ads:
        affected = df[df['ad_name'].isin(target_ads)]
        unaffected = df[~df['ad_name'].isin(target_ads)]
    else:
        affected = df
        unaffected = pd.DataFrame()

    current_spend = affected['spend'].sum()
    current_results = affected['results'].sum()
    current_cpr = current_spend / current_results if current_results > 0 else 0

    # Calculate new spend
    new_spend = current_spend * (1 + change_percent / 100)

    # Estimate new results (with diminishing returns for increases)
    if change_percent > 0:
        # Diminishing returns: cada 10% extra de budget da ~8% extra de resultados
        efficiency_factor = 0.8
        result_change_percent = change_percent * efficiency_factor
    else:
        # Linear decrease
        result_change_percent = change_percent

    estimated_results = current_results * (1 + result_change_percent / 100)
    estimated_cpr = new_spend / estimated_results if estimated_results > 0 else 0

    # Add unaffected
    if len(unaffected) > 0:
        total_current_spend = current_spend + unaffected['spend'].sum()
        total_new_spend = new_spend + unaffected['spend'].sum()
        total_current_results = current_results + unaffected['results'].sum()
        total_estimated_results = estimated_results + unaffected['results'].sum()
    else:
        total_current_spend = current_spend
        total_new_spend = new_spend
        total_current_results = current_results
        total_estimated_results = estimated_results

    return {
        'scenario': f'{"Aumentar" if change_percent > 0 else "Reducir"} budget {abs(change_percent):.0f}%',
        'current': {
            'spend': total_current_spend,
            'results': total_current_results,
            'cpr': total_current_spend / total_current_results if total_current_results > 0 else 0
        },
        'projected': {
            'spend': total_new_spend,
            'results': total_estimated_results,
            'cpr': total_new_spend / total_estimated_results if total_estimated_results > 0 else 0
        },
        'delta': {
            'spend': total_new_spend - total_current_spend,
            'results': total_estimated_results - total_current_results,
            'cpr_change': ((estimated_cpr - current_cpr) / current_cpr * 100) if current_cpr > 0 else 0
        },
        'confidence': 'medium',
        'note': 'Proyección basada en rendimientos decrecientes'
    }


def simulate_pause_ad(df: pd.DataFrame, ad_name: str) -> Dict:
    """
    Simula qué pasaría si se pausa un anuncio específico.
    """
    ad_data = df[df['ad_name'] == ad_name]
    other_data = df[df['ad_name'] != ad_name]

    if len(ad_data) == 0:
        return {'error': 'Anuncio no encontrado'}

    ad_spend = ad_data['spend'].sum()
    ad_results = ad_data['results'].sum()

    other_spend = other_data['spend'].sum()
    other_results = other_data['results'].sum()
    other_cpr = other_spend / other_results if other_results > 0 else 0

    # Si redistribuimos el budget del anuncio pausado a los demás
    redistributed_results = ad_spend / other_cpr if other_cpr > 0 else 0

    return {
        'scenario': f'Pausar "{ad_name}"',
        'ad_contribution': {
            'spend': ad_spend,
            'results': ad_results,
            'percent_of_total': (ad_results / (ad_results + other_results) * 100) if (ad_results + other_results) > 0 else 0
        },
        'without_redistribution': {
            'spend': other_spend,
            'results': other_results,
            'cpr': other_cpr
        },
        'with_redistribution': {
            'spend': other_spend + ad_spend,
            'results': other_results + redistributed_results,
            'cpr': (other_spend + ad_spend) / (other_results + redistributed_results) if (other_results + redistributed_results) > 0 else 0,
            'extra_results': redistributed_results
        },
        'recommendation': 'Pausar' if other_cpr < (ad_spend / ad_results if ad_results > 0 else 999999) else 'Mantener'
    }


# ==================== STRUCTURE DIAGNOSTIC ====================

def diagnose_account_structure(df: pd.DataFrame) -> List[Dict]:
    """
    Diagnostica problemas de estructura en la cuenta.
    """
    diagnostics = []

    # Conteo de estructura
    campaigns = df['campaign_name'].unique()

    for campaign in campaigns:
        campaign_df = df[df['campaign_name'] == campaign]
        ad_sets = campaign_df['ad_set_name'].unique()
        ads = campaign_df['ad_name'].unique()

        # Problema: Muy pocos anuncios por ad set
        for ad_set in ad_sets:
            ad_set_ads = campaign_df[campaign_df['ad_set_name'] == ad_set]['ad_name'].unique()
            if len(ad_set_ads) == 1:
                diagnostics.append({
                    'type': 'structure',
                    'severity': 'warning',
                    'title': 'Ad Set con un solo anuncio',
                    'message': f'"{ad_set}" tiene solo 1 anuncio. Recomendamos 3-5 para testeo efectivo.',
                    'campaign': campaign,
                    'ad_set': ad_set,
                    'recommendation': 'Agregar 2-4 variaciones del creativo'
                })

        # Problema: Demasiados ad sets
        if len(ad_sets) > 10:
            diagnostics.append({
                'type': 'structure',
                'severity': 'info',
                'title': 'Muchos Ad Sets',
                'message': f'Campaña "{campaign}" tiene {len(ad_sets)} ad sets. Considerar consolidar.',
                'campaign': campaign,
                'recommendation': 'Consolidar audiencias similares'
            })

    # Problema: Campañas duplicadas (mismo objetivo probable)
    campaign_spends = df.groupby('campaign_name')['spend'].sum().sort_values(ascending=False)
    if len(campaigns) > 5:
        diagnostics.append({
            'type': 'structure',
            'severity': 'info',
            'title': 'Muchas campañas activas',
            'message': f'Hay {len(campaigns)} campañas. Considerar consolidar por objetivo.',
            'recommendation': 'Revisar si hay campañas con el mismo objetivo que puedan unificarse'
        })

    # Problema: Anuncios duplicados
    ad_counts = df.groupby('ad_name').agg({
        'ad_set_name': 'nunique',
        'campaign_name': 'nunique'
    }).reset_index()

    duplicates = ad_counts[ad_counts['ad_set_name'] > 1]
    for _, row in duplicates.iterrows():
        diagnostics.append({
            'type': 'duplication',
            'severity': 'warning',
            'title': 'Anuncio duplicado',
            'message': f'"{row["ad_name"]}" aparece en {row["ad_set_name"]} ad sets diferentes.',
            'recommendation': 'Consolidar o diferenciar creativos'
        })

    return diagnostics


# ==================== ACCOUNT QUALITY SCORE ====================

def calculate_account_quality_score(df: pd.DataFrame) -> Dict:
    """
    Calcula un score de calidad de la cuenta para determinar si está lista para análisis.
    """
    score = 100
    issues = []

    # Check 1: Suficientes datos (mínimo 7 días)
    date_range = (df['date'].max() - df['date'].min()).days if len(df) > 0 else 0
    if date_range < 7:
        score -= 30
        issues.append({
            'issue': 'Pocos días de datos',
            'detail': f'Solo {date_range} días. Recomendamos mínimo 7.',
            'impact': -30
        })
    elif date_range < 14:
        score -= 15
        issues.append({
            'issue': 'Datos limitados',
            'detail': f'{date_range} días. Ideal: 14+',
            'impact': -15
        })

    # Check 2: Suficientes impresiones
    total_impressions = df['impressions'].sum()
    if total_impressions < 1000:
        score -= 25
        issues.append({
            'issue': 'Pocas impresiones',
            'detail': f'{total_impressions:,} impresiones. Mínimo recomendado: 1,000',
            'impact': -25
        })
    elif total_impressions < 10000:
        score -= 10
        issues.append({
            'issue': 'Impresiones moderadas',
            'detail': f'{total_impressions:,} impresiones. Ideal: 10,000+',
            'impact': -10
        })

    # Check 3: Suficientes resultados
    total_results = df['results'].sum()
    if total_results < 10:
        score -= 25
        issues.append({
            'issue': 'Pocos resultados',
            'detail': f'{total_results} resultados. Mínimo para análisis significativo: 10',
            'impact': -25
        })
    elif total_results < 50:
        score -= 10
        issues.append({
            'issue': 'Resultados limitados',
            'detail': f'{total_results} resultados. Ideal: 50+',
            'impact': -10
        })

    # Check 4: Diversificación de anuncios
    unique_ads = df['ad_name'].nunique()
    if unique_ads < 3:
        score -= 15
        issues.append({
            'issue': 'Poca diversificación',
            'detail': f'Solo {unique_ads} anuncio(s). Recomendamos 3-5 mínimo.',
            'impact': -15
        })

    # Check 5: Datos completos
    required_cols = ['spend', 'impressions', 'results', 'clicks']
    missing_data = []
    for col in required_cols:
        if col in df.columns and df[col].sum() == 0:
            missing_data.append(col)

    if missing_data:
        score -= 20
        issues.append({
            'issue': 'Datos incompletos',
            'detail': f'Columnas sin datos: {", ".join(missing_data)}',
            'impact': -20
        })

    score = max(0, score)

    return {
        'score': score,
        'status': 'ready' if score >= 70 else 'limited' if score >= 40 else 'insufficient',
        'message':
            'Cuenta lista para análisis completo' if score >= 70 else
            'Análisis posible con limitaciones' if score >= 40 else
            'Datos insuficientes para análisis confiable',
        'issues': issues,
        'summary': {
            'days': date_range,
            'impressions': total_impressions,
            'results': total_results,
            'ads': unique_ads
        }
    }


# ==================== AUDIENCE SATURATION PREDICTOR ====================

def predict_audience_saturation(df: pd.DataFrame) -> Dict:
    """
    Predice si la audiencia está saturándose basándose en frecuencia y alcance.
    """
    if len(df) < 7:
        return {'status': 'insufficient_data', 'message': 'Necesita al menos 7 días de datos'}

    # Ordenar por fecha
    df = df.sort_values('date')

    # Dividir en períodos
    mid = len(df) // 2
    first_half = df.iloc[:mid]
    second_half = df.iloc[mid:]

    # Calcular métricas por período
    freq_first = first_half['frequency'].mean()
    freq_second = second_half['frequency'].mean()

    reach_first = first_half['reach'].sum()
    reach_second = second_half['reach'].sum()

    impressions_first = first_half['impressions'].sum()
    impressions_second = second_half['impressions'].sum()

    # Tendencias
    freq_trend = ((freq_second - freq_first) / freq_first * 100) if freq_first > 0 else 0
    reach_trend = ((reach_second - reach_first) / reach_first * 100) if reach_first > 0 else 0

    # Determinar saturación
    saturation_score = 0

    if freq_trend > 20:
        saturation_score += 40
    elif freq_trend > 10:
        saturation_score += 20

    if reach_trend < -10:
        saturation_score += 40
    elif reach_trend < 0:
        saturation_score += 20

    if freq_second > 5:
        saturation_score += 20
    elif freq_second > 3:
        saturation_score += 10

    saturation_score = min(saturation_score, 100)

    status = 'critical' if saturation_score >= 70 else 'warning' if saturation_score >= 40 else 'healthy'

    return {
        'saturation_score': saturation_score,
        'status': status,
        'trends': {
            'frequency': {
                'first_period': freq_first,
                'second_period': freq_second,
                'change_percent': freq_trend
            },
            'reach': {
                'first_period': reach_first,
                'second_period': reach_second,
                'change_percent': reach_trend
            }
        },
        'recommendation':
            'Expandir audiencia urgentemente o pausar' if status == 'critical' else
            'Considerar expandir audiencia' if status == 'warning' else
            'Audiencia saludable',
        'estimated_days_left':
            max(0, int((100 - saturation_score) / 5)) if freq_trend > 0 else 30
    }


# ==================== COMPETITIVE INTELLIGENCE PROXY ====================

def analyze_competition_proxy(df: pd.DataFrame) -> Dict:
    """
    Infiere presión competitiva basándose en cambios de CPM sin cambios en audiencia.
    """
    if len(df) < 14:
        return {'status': 'insufficient_data', 'message': 'Necesita al menos 14 días de datos'}

    df = df.sort_values('date')

    # Dividir en semanas
    first_week = df.head(7)
    last_week = df.tail(7)

    cpm_first = (first_week['spend'].sum() / first_week['impressions'].sum() * 1000) if first_week['impressions'].sum() > 0 else 0
    cpm_last = (last_week['spend'].sum() / last_week['impressions'].sum() * 1000) if last_week['impressions'].sum() > 0 else 0

    cpm_change = ((cpm_last - cpm_first) / cpm_first * 100) if cpm_first > 0 else 0

    # Si CPM sube sin cambio significativo en reach, es presión competitiva
    reach_first = first_week['reach'].sum()
    reach_last = last_week['reach'].sum()
    reach_change = ((reach_last - reach_first) / reach_first * 100) if reach_first > 0 else 0

    competition_increasing = cpm_change > 15 and abs(reach_change) < 20

    # Análisis por día de la semana para detectar patrones
    df['day_of_week'] = pd.to_datetime(df['date']).dt.dayofweek
    day_cpms = df.groupby('day_of_week').apply(
        lambda x: x['spend'].sum() / x['impressions'].sum() * 1000 if x['impressions'].sum() > 0 else 0
    )

    best_day = day_cpms.idxmin()
    worst_day = day_cpms.idxmax()
    day_names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

    return {
        'cpm_trend': {
            'first_week': cpm_first,
            'last_week': cpm_last,
            'change_percent': cpm_change
        },
        'competition_pressure': 'increasing' if competition_increasing else 'stable',
        'recommendation':
            'Considerar horarios de menor competencia' if competition_increasing else
            'Condiciones de subasta estables',
        'best_days': [day_names[best_day]],
        'worst_days': [day_names[worst_day]],
        'insight': f'CPM más bajo los {day_names[best_day]} (${day_cpms[best_day]:.2f}) vs {day_names[worst_day]} (${day_cpms[worst_day]:.2f})'
    }


# ==================== ROI DE LA AGENCIA ====================

def calculate_agency_roi(
    df: pd.DataFrame,
    actions_taken: List[Dict]
) -> Dict:
    """
    Calcula el valor que la agencia aportó al cliente.
    """
    total_spend = df['spend'].sum()
    total_results = df['results'].sum()
    avg_cpr = total_spend / total_results if total_results > 0 else 0

    # Simular sin optimizaciones
    # Asumimos que sin la agencia, CPR sería 20-30% peor
    unoptimized_cpr = avg_cpr * 1.25

    # Calcular ahorro
    results_at_unoptimized = total_spend / unoptimized_cpr if unoptimized_cpr > 0 else 0
    extra_results = total_results - results_at_unoptimized

    # Valor del ahorro (asumiendo valor promedio por resultado)
    avg_result_value = 100  # Este debería ser configurable
    value_generated = extra_results * avg_result_value

    return {
        'total_spend_managed': total_spend,
        'total_results': total_results,
        'optimized_cpr': avg_cpr,
        'estimated_unoptimized_cpr': unoptimized_cpr,
        'extra_results_generated': extra_results,
        'estimated_value_generated': value_generated,
        'optimization_impact': f'+{(extra_results / results_at_unoptimized * 100):.0f}% más resultados' if results_at_unoptimized > 0 else 'N/A',
        'actions_summary': len(actions_taken)
    }


# ==================== PLAYBOOK GENERATOR ====================

def generate_playbook(df: pd.DataFrame, client_name: str) -> Dict:
    """
    Genera un playbook de mejores prácticas basado en los datos del cliente.
    """
    patterns = mine_patterns(df)
    quality = calculate_account_quality_score(df)

    # Extraer aprendizajes
    learnings = []

    # De patterns
    for pattern in patterns:
        if pattern['confidence'] in ['high', 'medium']:
            learnings.append({
                'type': 'works',
                'text': pattern['pattern'],
                'evidence': pattern['impact'],
                'category': pattern['category']
            })

    # De métricas
    if len(df) >= 7:
        # Mejor día
        df['day_of_week'] = pd.to_datetime(df['date']).dt.dayofweek
        day_stats = df.groupby('day_of_week').agg({
            'spend': 'sum',
            'results': 'sum'
        })
        day_stats['cpr'] = day_stats.apply(lambda r: r['spend'] / r['results'] if r['results'] > 0 else 999999, axis=1)
        best_day = day_stats['cpr'].idxmin()
        day_names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

        learnings.append({
            'type': 'insight',
            'text': f'Mejor día de la semana: {day_names[best_day]}',
            'evidence': f'CPR más bajo',
            'category': 'timing'
        })

        # Promedio de vida de anuncios
        ad_lifespans = df.groupby('ad_name')['date'].agg(['min', 'max'])
        ad_lifespans['days'] = (ad_lifespans['max'] - ad_lifespans['min']).dt.days
        avg_lifespan = ad_lifespans['days'].mean()

        learnings.append({
            'type': 'insight',
            'text': f'Vida promedio de anuncios: {avg_lifespan:.0f} días',
            'evidence': 'Basado en datos históricos',
            'category': 'creative'
        })

    return {
        'client_name': client_name,
        'generated_at': datetime.now().isoformat(),
        'quality_score': quality['score'],
        'learnings': learnings,
        'recommended_structure': {
            'ads_per_adset': '3-5',
            'adsets_per_campaign': '2-4',
            'creative_rotation': f'Cada {max(7, int(avg_lifespan * 0.7)):.0f} días' if 'avg_lifespan' in dir() else 'Cada 14-21 días'
        },
        'do': [l['text'] for l in learnings if l['type'] == 'works'][:5],
        'dont': [],  # Se podría agregar con más datos
        'monitor': [
            'Frecuencia > 3.5',
            'CTR cayendo >20% semanal',
            'CPR subiendo >30% semanal'
        ]
    }
