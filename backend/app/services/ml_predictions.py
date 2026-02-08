"""
ML Predictions Service for Emiti Metrics
Includes: Fatigue prediction, ROAS forecasting, Anomaly detection
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from scipy import stats


# ==================== FATIGUE PREDICTION MODEL ====================

def calculate_fatigue_score(
    frequency: float,
    ctr_trend_7d: float,
    cpr_trend_7d: float,
    days_running: int,
    impressions: int
) -> int:
    """
    Calcula un score de fatiga de 0-100 para un anuncio.
    Basado en investigación de Meta sobre ad fatigue.

    Factores:
    - Frecuencia alta = más fatiga
    - CTR bajando = señal de fatiga
    - CPR subiendo = señal de fatiga
    - Más días corriendo = más probable fatiga
    """
    score = 0

    # Factor 1: Frecuencia (0-30 pts)
    # Meta recomienda frecuencia < 4 para evitar fatiga
    if frequency >= 6:
        score += 30
    elif frequency >= 4.5:
        score += 25
    elif frequency >= 3.5:
        score += 20
    elif frequency >= 2.5:
        score += 10
    elif frequency >= 2:
        score += 5

    # Factor 2: Tendencia CTR últimos 7 días (0-30 pts)
    # CTR cayendo es señal clara de fatiga
    if ctr_trend_7d < -30:
        score += 30
    elif ctr_trend_7d < -20:
        score += 25
    elif ctr_trend_7d < -10:
        score += 15
    elif ctr_trend_7d < -5:
        score += 8

    # Factor 3: Tendencia CPR últimos 7 días (0-25 pts)
    if cpr_trend_7d > 50:
        score += 25
    elif cpr_trend_7d > 30:
        score += 18
    elif cpr_trend_7d > 15:
        score += 10
    elif cpr_trend_7d > 8:
        score += 5

    # Factor 4: Días corriendo (0-15 pts)
    if days_running >= 28:
        score += 15
    elif days_running >= 21:
        score += 12
    elif days_running >= 14:
        score += 8
    elif days_running >= 10:
        score += 4

    return min(score, 100)


def predict_ad_fatigue(df: pd.DataFrame) -> List[Dict]:
    """
    Predice fatiga para todos los anuncios en el DataFrame.
    Retorna lista ordenada por urgencia.
    """
    if len(df) < 7:
        return []

    predictions = []
    df = df.copy()
    df['date'] = pd.to_datetime(df['date'])

    # Agrupar por anuncio
    for ad_name in df['ad_name'].unique():
        ad_df = df[df['ad_name'] == ad_name].sort_values('date')

        if len(ad_df) < 3:
            continue

        # Calcular métricas
        days_running = (ad_df['date'].max() - ad_df['date'].min()).days + 1
        avg_frequency = ad_df['frequency'].mean() if 'frequency' in ad_df.columns else 1.5
        total_impressions = ad_df['impressions'].sum()

        # Calcular tendencias de últimos 7 días
        last_7 = ad_df.tail(7) if len(ad_df) >= 7 else ad_df
        first_half = last_7.head(len(last_7) // 2 + 1)
        second_half = last_7.tail(len(last_7) // 2 + 1)

        # CTR trend
        ctr_first = first_half['clicks'].sum() / first_half['impressions'].sum() * 100 if first_half['impressions'].sum() > 0 else 0
        ctr_second = second_half['clicks'].sum() / second_half['impressions'].sum() * 100 if second_half['impressions'].sum() > 0 else 0
        ctr_trend = ((ctr_second - ctr_first) / ctr_first * 100) if ctr_first > 0 else 0

        # CPR trend
        cpr_first = first_half['spend'].sum() / first_half['results'].sum() if first_half['results'].sum() > 0 else 0
        cpr_second = second_half['spend'].sum() / second_half['results'].sum() if second_half['results'].sum() > 0 else 0
        cpr_trend = ((cpr_second - cpr_first) / cpr_first * 100) if cpr_first > 0 else 0

        # Calcular score
        fatigue_score = calculate_fatigue_score(
            frequency=avg_frequency,
            ctr_trend_7d=ctr_trend,
            cpr_trend_7d=cpr_trend,
            days_running=days_running,
            impressions=total_impressions
        )

        # Determinar estado y acción
        if fatigue_score >= 70:
            status = 'critical'
            action = 'Pausar o refrescar inmediatamente'
            days_left = 0
        elif fatigue_score >= 50:
            status = 'warning'
            action = 'Preparar reemplazo'
            days_left = max(1, 7 - int(fatigue_score - 50) // 4)
        elif fatigue_score >= 30:
            status = 'monitoring'
            action = 'Monitorear de cerca'
            days_left = max(7, 14 - int(fatigue_score - 30) // 3)
        else:
            status = 'healthy'
            action = 'Sin acción necesaria'
            days_left = 21

        predictions.append({
            'ad_name': ad_name,
            'ad_set': ad_df['ad_set_name'].iloc[0] if 'ad_set_name' in ad_df.columns else 'Unknown',
            'campaign': ad_df['campaign_name'].iloc[0] if 'campaign_name' in ad_df.columns else 'Unknown',
            'fatigue_score': fatigue_score,
            'status': status,
            'action': action,
            'estimated_days_left': days_left,
            'factors': {
                'frequency': round(avg_frequency, 2),
                'ctr_trend_7d': round(ctr_trend, 1),
                'cpr_trend_7d': round(cpr_trend, 1),
                'days_running': days_running
            },
            'metrics': {
                'total_spend': ad_df['spend'].sum(),
                'total_results': ad_df['results'].sum(),
                'avg_cpr': ad_df['spend'].sum() / ad_df['results'].sum() if ad_df['results'].sum() > 0 else 0
            }
        })

    # Ordenar por urgencia (score desc)
    predictions.sort(key=lambda x: x['fatigue_score'], reverse=True)

    return predictions


# ==================== ROAS FORECASTING ====================

def forecast_roas(df: pd.DataFrame, days_ahead: int = 7) -> Dict:
    """
    Pronostica ROAS para los próximos días usando regresión lineal simple
    y análisis de tendencias.
    """
    if len(df) < 7:
        return {'error': 'Necesita al menos 7 días de datos para forecast'}

    df = df.copy()
    df['date'] = pd.to_datetime(df['date'])

    # Agregar por día
    daily = df.groupby('date').agg({
        'spend': 'sum',
        'results': 'sum',
        'impressions': 'sum',
        'clicks': 'sum'
    }).reset_index()

    daily['cpr'] = daily.apply(
        lambda r: r['spend'] / r['results'] if r['results'] > 0 else 0,
        axis=1
    )
    daily['ctr'] = daily.apply(
        lambda r: r['clicks'] / r['impressions'] * 100 if r['impressions'] > 0 else 0,
        axis=1
    )

    # Crear índice numérico para regresión
    daily = daily.sort_values('date')
    daily['day_index'] = range(len(daily))

    # Regresión lineal para CPR
    x = daily['day_index'].values
    y_cpr = daily['cpr'].values

    # Filtrar outliers extremos
    q1, q3 = np.percentile(y_cpr, [25, 75])
    iqr = q3 - q1
    mask = (y_cpr >= q1 - 1.5 * iqr) & (y_cpr <= q3 + 1.5 * iqr)
    x_clean = x[mask]
    y_clean = y_cpr[mask]

    if len(x_clean) < 3:
        x_clean, y_clean = x, y_cpr

    # Fit linear regression
    slope, intercept, r_value, p_value, std_err = stats.linregress(x_clean, y_clean)

    # Proyectar próximos días
    future_days = list(range(len(daily), len(daily) + days_ahead))
    projected_cpr = [intercept + slope * d for d in future_days]

    # Calcular intervalos de confianza (95%)
    confidence_interval = 1.96 * std_err * np.sqrt(1 + 1/len(x_clean) + (np.array(future_days) - np.mean(x_clean))**2 / np.sum((x_clean - np.mean(x_clean))**2))

    cpr_lower = [max(0, p - c) for p, c in zip(projected_cpr, confidence_interval)]
    cpr_upper = [p + c for p, c in zip(projected_cpr, confidence_interval)]

    # Calcular métricas históricas
    avg_cpr = daily['cpr'].mean()
    avg_daily_spend = daily['spend'].mean()
    avg_daily_results = daily['results'].mean()

    # Proyectar resultados basándose en spend promedio y CPR proyectado
    projected_results = []
    for cpr in projected_cpr:
        if cpr > 0:
            projected_results.append(avg_daily_spend / cpr)
        else:
            projected_results.append(avg_daily_results)

    # Determinar tendencia
    if slope > 0.5:
        trend = 'deteriorating'
        trend_message = 'CPR subiendo - eficiencia deteriorándose'
    elif slope < -0.5:
        trend = 'improving'
        trend_message = 'CPR bajando - eficiencia mejorando'
    else:
        trend = 'stable'
        trend_message = 'Performance estable'

    # Generar fechas futuras
    last_date = daily['date'].max()
    future_dates = [(last_date + timedelta(days=i+1)).strftime('%Y-%m-%d') for i in range(days_ahead)]

    return {
        'forecast_period': {
            'start': future_dates[0],
            'end': future_dates[-1],
            'days': days_ahead
        },
        'trend': {
            'direction': trend,
            'message': trend_message,
            'slope': round(slope, 4),
            'r_squared': round(r_value ** 2, 3),
            'confidence': 'high' if r_value ** 2 > 0.6 else 'medium' if r_value ** 2 > 0.3 else 'low'
        },
        'historical': {
            'avg_cpr': round(avg_cpr, 2),
            'avg_daily_spend': round(avg_daily_spend, 2),
            'avg_daily_results': round(avg_daily_results, 1),
            'total_days': len(daily)
        },
        'projections': [
            {
                'date': date,
                'projected_cpr': round(cpr, 2),
                'cpr_range': [round(lo, 2), round(hi, 2)],
                'projected_results': round(results, 1)
            }
            for date, cpr, lo, hi, results in zip(
                future_dates, projected_cpr, cpr_lower, cpr_upper, projected_results
            )
        ],
        'summary': {
            'projected_total_results': round(sum(projected_results), 0),
            'projected_avg_cpr': round(np.mean(projected_cpr), 2),
            'projected_total_spend': round(avg_daily_spend * days_ahead, 2)
        }
    }


# ==================== ANOMALY DETECTION ====================

def detect_anomalies(df: pd.DataFrame, sensitivity: float = 2.0) -> List[Dict]:
    """
    Detecta anomalías en las métricas usando Z-score y comparación con histórico.

    Args:
        df: DataFrame con datos
        sensitivity: Multiplicador para el umbral de Z-score (default 2.0 = ~95%)
    """
    if len(df) < 7:
        return []

    df = df.copy()
    df['date'] = pd.to_datetime(df['date'])

    # Agregar por día
    daily = df.groupby('date').agg({
        'spend': 'sum',
        'results': 'sum',
        'impressions': 'sum',
        'clicks': 'sum'
    }).reset_index().sort_values('date')

    # Calcular métricas derivadas
    daily['cpr'] = daily.apply(
        lambda r: r['spend'] / r['results'] if r['results'] > 0 else 0,
        axis=1
    )
    daily['ctr'] = daily.apply(
        lambda r: r['clicks'] / r['impressions'] * 100 if r['impressions'] > 0 else 0,
        axis=1
    )
    daily['cpm'] = daily.apply(
        lambda r: r['spend'] / r['impressions'] * 1000 if r['impressions'] > 0 else 0,
        axis=1
    )

    anomalies = []
    metrics_to_check = ['spend', 'results', 'cpr', 'ctr', 'cpm']

    for metric in metrics_to_check:
        values = daily[metric].values
        if len(values) < 5:
            continue

        mean = np.mean(values)
        std = np.std(values)

        if std == 0:
            continue

        for i, (val, date) in enumerate(zip(values, daily['date'])):
            z_score = (val - mean) / std

            if abs(z_score) > sensitivity:
                # Determinar si es buena o mala anomalía
                if metric in ['results', 'ctr']:
                    is_positive = z_score > 0
                elif metric in ['cpr', 'cpm', 'spend']:
                    is_positive = z_score < 0
                else:
                    is_positive = False

                # Descripción contextual
                if metric == 'spend':
                    desc = 'Gasto inusualmente ' + ('alto' if z_score > 0 else 'bajo')
                elif metric == 'results':
                    desc = 'Resultados inusualmente ' + ('altos' if z_score > 0 else 'bajos')
                elif metric == 'cpr':
                    desc = 'CPR inusualmente ' + ('alto' if z_score > 0 else 'bajo')
                elif metric == 'ctr':
                    desc = 'CTR inusualmente ' + ('alto' if z_score > 0 else 'bajo')
                else:
                    desc = f'{metric.upper()} inusual'

                anomalies.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'metric': metric,
                    'value': round(val, 2),
                    'expected_range': [round(mean - std, 2), round(mean + std, 2)],
                    'z_score': round(z_score, 2),
                    'deviation_percent': round((val - mean) / mean * 100, 1) if mean != 0 else 0,
                    'severity': 'high' if abs(z_score) > 3 else 'medium',
                    'type': 'positive' if is_positive else 'negative',
                    'description': desc,
                    'requires_attention': not is_positive
                })

    # Detectar anomalías de patrón (cambios bruscos día a día)
    for metric in ['cpr', 'results']:
        values = daily[metric].values
        for i in range(1, len(values)):
            if values[i-1] == 0:
                continue
            pct_change = (values[i] - values[i-1]) / values[i-1] * 100

            if abs(pct_change) > 50:  # Cambio >50% día a día
                date = daily['date'].iloc[i]
                is_positive = (metric == 'results' and pct_change > 0) or (metric == 'cpr' and pct_change < 0)

                anomalies.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'metric': f'{metric}_change',
                    'value': round(values[i], 2),
                    'previous_value': round(values[i-1], 2),
                    'change_percent': round(pct_change, 1),
                    'severity': 'high' if abs(pct_change) > 80 else 'medium',
                    'type': 'positive' if is_positive else 'negative',
                    'description': f'Cambio brusco en {metric.upper()}: {"+" if pct_change > 0 else ""}{pct_change:.0f}%',
                    'requires_attention': not is_positive
                })

    # Ordenar por fecha descendente y severidad
    anomalies.sort(key=lambda x: (x['date'], x['severity'] == 'high'), reverse=True)

    return anomalies


def get_anomaly_summary(anomalies: List[Dict]) -> Dict:
    """
    Genera un resumen de las anomalías detectadas.
    """
    if not anomalies:
        return {
            'total_anomalies': 0,
            'status': 'healthy',
            'message': 'No se detectaron anomalías significativas',
            'breakdown': {}
        }

    high_severity = [a for a in anomalies if a['severity'] == 'high']
    negative = [a for a in anomalies if a['type'] == 'negative']

    # Agrupar por métrica
    by_metric = {}
    for a in anomalies:
        metric = a['metric'].replace('_change', '')
        if metric not in by_metric:
            by_metric[metric] = {'count': 0, 'high_severity': 0, 'negative': 0}
        by_metric[metric]['count'] += 1
        if a['severity'] == 'high':
            by_metric[metric]['high_severity'] += 1
        if a['type'] == 'negative':
            by_metric[metric]['negative'] += 1

    # Determinar status
    if len(high_severity) > 3 or len(negative) > len(anomalies) * 0.6:
        status = 'critical'
        message = 'Múltiples anomalías críticas detectadas - revisar cuenta'
    elif len(high_severity) > 0:
        status = 'warning'
        message = 'Anomalías significativas detectadas - monitorear de cerca'
    else:
        status = 'attention'
        message = 'Algunas variaciones inusuales detectadas'

    return {
        'total_anomalies': len(anomalies),
        'high_severity_count': len(high_severity),
        'negative_count': len(negative),
        'positive_count': len(anomalies) - len(negative),
        'status': status,
        'message': message,
        'breakdown': by_metric,
        'most_recent': anomalies[0] if anomalies else None,
        'most_critical': high_severity[0] if high_severity else None
    }


# ==================== COMBINED ML INSIGHTS ====================

def get_ml_insights(df: pd.DataFrame) -> Dict:
    """
    Ejecuta todos los modelos ML y devuelve un resumen consolidado.
    """
    insights = {
        'generated_at': datetime.now().isoformat(),
        'data_quality': {
            'days': (df['date'].max() - df['date'].min()).days if len(df) > 0 else 0,
            'ads': df['ad_name'].nunique() if 'ad_name' in df.columns else 0,
            'sufficient': len(df) >= 7
        }
    }

    if len(df) < 7:
        insights['error'] = 'Datos insuficientes para análisis ML (mínimo 7 días)'
        return insights

    # Fatigue predictions
    fatigue = predict_ad_fatigue(df)
    insights['fatigue'] = {
        'critical_count': len([f for f in fatigue if f['status'] == 'critical']),
        'warning_count': len([f for f in fatigue if f['status'] == 'warning']),
        'healthy_count': len([f for f in fatigue if f['status'] == 'healthy']),
        'top_at_risk': fatigue[:3] if fatigue else []
    }

    # ROAS forecast
    forecast = forecast_roas(df, days_ahead=7)
    if 'error' not in forecast:
        insights['forecast'] = {
            'trend': forecast['trend']['direction'],
            'confidence': forecast['trend']['confidence'],
            'projected_avg_cpr': forecast['summary']['projected_avg_cpr'],
            'projected_results_7d': forecast['summary']['projected_total_results']
        }

    # Anomalies
    anomalies = detect_anomalies(df)
    insights['anomalies'] = get_anomaly_summary(anomalies)

    # Overall health score
    health_score = 100

    # Penalizar por fatiga crítica
    health_score -= insights['fatigue']['critical_count'] * 15
    health_score -= insights['fatigue']['warning_count'] * 5

    # Penalizar por anomalías negativas
    if insights['anomalies']['status'] == 'critical':
        health_score -= 20
    elif insights['anomalies']['status'] == 'warning':
        health_score -= 10

    # Penalizar por tendencia deteriorante
    if 'forecast' in insights and insights['forecast']['trend'] == 'deteriorating':
        health_score -= 10

    health_score = max(0, min(100, health_score))

    insights['health_score'] = health_score
    insights['health_status'] = (
        'excellent' if health_score >= 80 else
        'good' if health_score >= 60 else
        'fair' if health_score >= 40 else
        'poor'
    )

    return insights
