import React, { useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm@3.1.1';
import { colors } from '../colorblind_palette.js';

const html = htm.bind(React.createElement);

export function DataQualityResults({ results, analysis }) {
    const chartRef = useRef(null);

    useEffect(() => {
        if (chartRef.current && results.issues) {
            const ctx = chartRef.current.getContext('2d');

            // Destroy existing chart if any
            if (window.myChart) window.myChart.destroy();

            const severityCounts = { High: 0, Medium: 0, Low: 0 };
            results.issues.forEach(i => severityCounts[i.severity] = (severityCounts[i.severity] || 0) + 1);

            window.myChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['High', 'Medium', 'Low'],
                    datasets: [{
                        data: [severityCounts.High, severityCounts.Medium, severityCounts.Low],
                        backgroundColor: ['#CC3300', '#CC9900', '#0066CC']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                font: { size: 14, family: 'Inter' },
                                padding: 16,
                                color: '#111111'
                            }
                        }
                    }
                }
            });
        }
    }, [results]);

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'High': return '#CC3300';
            case 'Medium': return '#CC9900';
            case 'Low': return '#0066CC';
            default: return '#666666';
        }
    };

    const getScoreColor = (score) => {
        if (score > 80) return '#008060';
        if (score > 50) return '#CC9900';
        return '#CC3300';
    };

    return html`
        <div className="grid">
            <div>
                <div style=${{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '24px',
            padding: '20px',
            background: '#f5f7fa',
            borderRadius: '12px'
        }}>
                    <div style=${{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: getScoreColor(results.dq_score),
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: '700',
            flexShrink: 0
        }}>
                        ${results.dq_score}
                    </div>
                    <div>
                        <h3 style=${{ fontSize: '1.25rem', marginBottom: '8px', color: '#111111' }}>Data Quality Score</h3>
                        <p style=${{ margin: 0, color: '#444444', fontSize: '1rem', lineHeight: '1.6' }}>${analysis.summary}</p>
                    </div>
                </div>

                <h4 style=${{ fontSize: '1.125rem', marginBottom: '16px', color: '#111111' }}>Identified Issues</h4>
                <ul style=${{ listStyle: 'none', padding: 0, margin: 0 }}>
                    ${results.issues.map((issue, idx) => html`
                        <li key=${idx} style=${{
                padding: '16px',
                borderLeft: '4px solid',
                borderColor: getSeverityColor(issue.severity),
                marginBottom: '12px',
                backgroundColor: '#f5f7fa',
                borderRadius: '0 8px 8px 0'
            }}>
                            <div style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <strong style=${{ fontSize: '1rem', color: '#111111' }}>${issue.type}</strong>
                                <span style=${{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600',
                backgroundColor: getSeverityColor(issue.severity),
                color: 'white'
            }}>${issue.severity}</span>
                            </div>
                            <p style=${{ margin: 0, color: '#444444', fontSize: '0.9375rem', lineHeight: '1.5' }}>${issue.details}</p>
                        </li>
                    `)}
                </ul>
            </div>
            <div>
                <h4 style=${{ fontSize: '1.125rem', marginBottom: '16px', color: '#111111' }}>Issue Severity Distribution</h4>
                <div className="chart-container">
                    <canvas ref=${chartRef}></canvas>
                </div>
                
                <h4 style=${{ marginTop: '24px', fontSize: '1.125rem', marginBottom: '16px', color: '#111111' }}>Pipeline Health</h4>
                <div style=${{
            padding: '20px',
            backgroundColor: '#f5f7fa',
            borderRadius: '8px',
            border: '1px solid #d0d5dd'
        }}>
                    <div style=${{ marginBottom: '12px' }}>
                        <strong style=${{ color: '#111111', fontSize: '1rem' }}>Status:</strong>
                        <span style=${{ marginLeft: '8px', color: '#444444', fontSize: '1rem' }}>${analysis.pipeline_health}</span>
                    </div>
                    <p style=${{ margin: 0, color: '#444444', fontSize: '0.9375rem', lineHeight: '1.6' }}>${analysis.root_cause_analysis}</p>
                </div>
            </div>
        </div>
    `;
}
