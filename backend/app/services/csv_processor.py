"""
Servicio para procesar archivos CSV de Meta Ads
Limpia, normaliza y transforma los datos para análisis
"""
import pandas as pd
import numpy as np
from typing import Optional, Dict, List
from io import BytesIO, StringIO


# ==================== COLUMN MAPPINGS ====================

# Mapeo de columnas de Meta Ads (español) a nombres normalizados
COLUMN_MAPPINGS = {
    # Identificadores
    'Nombre de la campaña': 'campaign_name',
    'Nombre del conjunto de anuncios': 'ad_set_name',
    'Nombre del anuncio': 'ad_name',
    'Día': 'date',
    'Fecha': 'date',

    # Gasto
    'Importe gastado (ARS)': 'spend',
    'Importe gastado': 'spend',
    'Cantidad gastada (ARS)': 'spend',
    'Amount Spent (ARS)': 'spend',

    # Alcance
    'Impresiones': 'impressions',
    'Alcance': 'reach',
    'Frecuencia': 'frequency',

    # Clics
    'Clics (todos)': 'clicks',
    'Clics en el enlace': 'link_clicks',
    'Clics': 'clicks',
    'CPC (costo por clic en el enlace)': 'cpc',
    'CPC (todos)': 'cpc',
    'CTR (tasa de clics en el enlace)': 'ctr',
    'CTR (todos)': 'ctr',
    'CPM (costo por 1.000 impresiones)': 'cpm',

    # Resultados
    'Resultados': 'results',
    'Costo por resultado': 'cost_per_result',
    'Conversiones': 'results',

    # Mensajes
    'Conversaciones de mensajes iniciadas': 'messaging_conversations',
    'Mensajes iniciados': 'messaging_conversations',
    'Nueva conversación de mensajes iniciada': 'messaging_conversations',

    # Compras
    'Compras': 'purchases',
    'Valor de conversión de compras': 'purchase_value',
    'ROAS de las compras': 'roas',

    # Leads
    'Leads': 'leads',
    'Registros completados': 'leads',
}


def normalize_column_name(col: str) -> str:
    """Normaliza el nombre de una columna usando el mapeo."""
    return COLUMN_MAPPINGS.get(col.strip(), col.lower().replace(' ', '_'))


def clean_numeric(value) -> float:
    """Limpia y convierte valores numéricos."""
    if pd.isna(value):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        # Remove currency symbols, thousand separators, etc.
        cleaned = value.replace('$', '').replace(',', '').replace('.', '').replace(' ', '')
        # Handle percentage
        if '%' in cleaned:
            cleaned = cleaned.replace('%', '')
            try:
                return float(cleaned) / 100
            except ValueError:
                return 0.0
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
    return 0.0


def process_csv(file_content: bytes, encoding: str = 'utf-8') -> pd.DataFrame:
    """
    Procesa un archivo CSV de Meta Ads y retorna un DataFrame normalizado.

    Args:
        file_content: Contenido del archivo CSV en bytes
        encoding: Codificación del archivo

    Returns:
        DataFrame con columnas normalizadas y datos limpios
    """
    # Try different encodings if default fails
    encodings_to_try = [encoding, 'utf-8', 'latin-1', 'cp1252']

    df = None
    for enc in encodings_to_try:
        try:
            df = pd.read_csv(BytesIO(file_content), encoding=enc)
            break
        except UnicodeDecodeError:
            continue

    if df is None:
        raise ValueError("No se pudo leer el archivo CSV con ninguna codificación conocida")

    # Normalize column names
    df.columns = [normalize_column_name(col) for col in df.columns]

    # Ensure required columns exist
    required_cols = ['campaign_name', 'ad_set_name', 'ad_name', 'date', 'spend', 'impressions']
    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        raise ValueError(f"Columnas requeridas faltantes: {missing}")

    # Parse date
    df['date'] = pd.to_datetime(df['date'], dayfirst=True, errors='coerce')

    # Clean numeric columns
    numeric_cols = [
        'spend', 'impressions', 'reach', 'frequency', 'clicks', 'link_clicks',
        'ctr', 'cpc', 'cpm', 'results', 'cost_per_result',
        'messaging_conversations', 'purchases', 'purchase_value', 'roas', 'leads'
    ]

    for col in numeric_cols:
        if col in df.columns:
            df[col] = df[col].apply(clean_numeric)
        else:
            df[col] = 0.0

    # Calculate missing metrics if possible
    if 'ctr' not in df.columns or df['ctr'].sum() == 0:
        df['ctr'] = df.apply(
            lambda r: (r['clicks'] / r['impressions'] * 100) if r['impressions'] > 0 else 0,
            axis=1
        )

    if 'frequency' not in df.columns or df['frequency'].sum() == 0:
        df['frequency'] = df.apply(
            lambda r: (r['impressions'] / r['reach']) if r['reach'] > 0 else 0,
            axis=1
        )

    if 'cpc' not in df.columns or df['cpc'].sum() == 0:
        df['cpc'] = df.apply(
            lambda r: (r['spend'] / r['clicks']) if r['clicks'] > 0 else 0,
            axis=1
        )

    if 'cpm' not in df.columns or df['cpm'].sum() == 0:
        df['cpm'] = df.apply(
            lambda r: (r['spend'] / r['impressions'] * 1000) if r['impressions'] > 0 else 0,
            axis=1
        )

    if 'cost_per_result' not in df.columns or df['cost_per_result'].sum() == 0:
        df['cost_per_result'] = df.apply(
            lambda r: (r['spend'] / r['results']) if r['results'] > 0 else 0,
            axis=1
        )

    # Use messaging_conversations as results if results is empty and messaging exists
    if df['results'].sum() == 0 and df['messaging_conversations'].sum() > 0:
        df['results'] = df['messaging_conversations']

    # Use leads as results if results is empty and leads exists
    if df['results'].sum() == 0 and df['leads'].sum() > 0:
        df['results'] = df['leads']

    # Use purchases as results if results is empty and purchases exists
    if df['results'].sum() == 0 and df['purchases'].sum() > 0:
        df['results'] = df['purchases']

    # Drop rows with invalid dates
    df = df.dropna(subset=['date'])

    # Sort by date
    df = df.sort_values('date')

    return df


def aggregate_by_date(df: pd.DataFrame) -> pd.DataFrame:
    """Agrega métricas por fecha."""
    return df.groupby('date').agg({
        'spend': 'sum',
        'impressions': 'sum',
        'reach': 'sum',
        'clicks': 'sum',
        'results': 'sum',
    }).reset_index()


def aggregate_by_ad(df: pd.DataFrame) -> pd.DataFrame:
    """Agrega métricas por anuncio."""
    return df.groupby(['campaign_name', 'ad_set_name', 'ad_name']).agg({
        'spend': 'sum',
        'impressions': 'sum',
        'reach': 'sum',
        'clicks': 'sum',
        'results': 'sum',
        'date': ['min', 'max', 'count']
    }).reset_index()


def get_campaign_summary(df: pd.DataFrame) -> Dict:
    """Retorna un resumen de las campañas en el dataset."""
    return {
        'total_rows': len(df),
        'date_range': {
            'start': df['date'].min().isoformat() if len(df) > 0 else None,
            'end': df['date'].max().isoformat() if len(df) > 0 else None,
        },
        'campaigns': df['campaign_name'].nunique(),
        'ad_sets': df['ad_set_name'].nunique(),
        'ads': df['ad_name'].nunique(),
        'total_spend': df['spend'].sum(),
        'total_results': df['results'].sum(),
        'campaign_names': df['campaign_name'].unique().tolist()
    }
