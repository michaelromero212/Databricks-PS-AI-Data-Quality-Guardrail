import React, { useState, useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(React.createElement);

export function ReportCard({ reportPath, analysis, scanId }) {
    const [reportContent, setReportContent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (scanId) {
            fetchReport();
        }
    }, [scanId]);

    const fetchReport = async () => {
        try {
            const res = await fetch(`/api/report/${scanId}`);
            if (res.ok) {
                const text = await res.text();
                setReportContent(text);
            }
        } catch (err) {
            console.error('Failed to fetch report:', err);
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = () => {
        const blob = new Blob([reportContent || ''], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dq_report_${scanId}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const styles = {
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
        },
        scoreCard: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 24px',
            backgroundColor: analysis?.score >= 80 ? '#d4edda' : analysis?.score >= 60 ? '#fff3cd' : '#f8d7da',
            borderRadius: '12px',
            border: `2px solid ${analysis?.score >= 80 ? '#008060' : analysis?.score >= 60 ? '#CC9900' : '#CC3300'}`
        },
        scoreNumber: {
            fontSize: '2rem',
            fontWeight: '700',
            color: analysis?.score >= 80 ? '#008060' : analysis?.score >= 60 ? '#996600' : '#CC3300'
        },
        section: {
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #d0d5dd'
        },
        sectionTitle: {
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#111111',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        issueList: {
            listStyle: 'none',
            padding: 0,
            margin: 0
        },
        issueItem: {
            padding: '12px 16px',
            marginBottom: '8px',
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            borderLeft: '4px solid',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        badge: {
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '600'
        },
        codeBlock: {
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            padding: '16px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            overflowX: 'auto',
            marginTop: '12px'
        },
        buttonRow: {
            display: 'flex',
            gap: '12px',
            marginTop: '24px'
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'high': return '#CC3300';
            case 'medium': return '#CC9900';
            case 'low': return '#008060';
            default: return '#666666';
        }
    };

    if (loading) {
        return html`<div><p>Loading report...</p></div>`;
    }

    return html`
        <div>
            <div style=${styles.header}>
                <div>
                    <h3 style=${{ margin: 0, color: '#111111' }}>Data Quality Assessment Report</h3>
                    <p style=${{ margin: '8px 0 0 0', color: '#666666' }}>Generated from scan analysis</p>
                </div>
                <div style=${styles.scoreCard}>
                    <span style=${{ color: '#444444', fontWeight: '500' }}>DQ Score</span>
                    <span style=${styles.scoreNumber}>${analysis?.score || 'N/A'}</span>
                </div>
            </div>

            <!-- Executive Summary -->
            <div style=${styles.section}>
                <div style=${styles.sectionTitle}>
                    <span>📋</span> Executive Summary
                </div>
                <p style=${{ margin: 0, color: '#444444', lineHeight: '1.7' }}>${analysis?.summary}</p>
            </div>

            <!-- Pipeline Health -->
            <div style=${styles.section}>
                <div style=${styles.sectionTitle}>
                    <span>🔧</span> Pipeline Health
                </div>
                <div style=${{
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: analysis?.pipeline_health === 'Healthy' ? '#d4edda' : '#fff3cd',
            borderRadius: '20px',
            color: analysis?.pipeline_health === 'Healthy' ? '#008060' : '#996600',
            fontWeight: '600'
        }}>
                    ${analysis?.pipeline_health || 'Unknown'}
                </div>
            </div>

            <!-- Issues Found -->
            ${analysis?.issues?.length > 0 && html`
                <div style=${styles.section}>
                    <div style=${styles.sectionTitle}>
                        <span>⚠️</span> Issues Found (${analysis.issues.length})
                    </div>
                    <ul style=${styles.issueList}>
                        ${analysis.issues.map((issue, idx) => html`
                            <li key=${idx} style=${{ ...styles.issueItem, borderLeftColor: getSeverityColor(issue.severity) }}>
                                <div>
                                    <strong style=${{ color: '#111111' }}>${issue.type}</strong>
                                    <p style=${{ margin: '4px 0 0', color: '#666666', fontSize: '0.9rem' }}>${issue.description}</p>
                                </div>
                                <span style=${{
                ...styles.badge,
                backgroundColor: getSeverityColor(issue.severity) + '20',
                color: getSeverityColor(issue.severity)
            }}>${issue.severity}</span>
                            </li>
                        `)}
                    </ul>
                </div>
            `}

            <!-- Root Cause Analysis -->
            <div style=${styles.section}>
                <div style=${styles.sectionTitle}>
                    <span>🔍</span> Root Cause Analysis
                </div>
                <p style=${{ margin: 0, color: '#444444', lineHeight: '1.7' }}>${analysis?.root_cause}</p>
            </div>

            <!-- Recommendations -->
            <div style=${styles.section}>
                <div style=${styles.sectionTitle}>
                    <span>💡</span> Recommended Fixes
                </div>
                <div style=${{ marginBottom: '16px' }}>
                    <strong style=${{ color: '#111111' }}>SQL Fix:</strong>
                    <pre style=${styles.codeBlock}>${analysis?.sql_fix || 'DELETE FROM table WHERE id IS NULL;'}</pre>
                </div>
                <div>
                    <strong style=${{ color: '#111111' }}>Python Fix:</strong>
                    <pre style=${styles.codeBlock}>${analysis?.python_fix || "df = df.dropna(subset=['critical_col'])"}</pre>
                </div>
            </div>

            <!-- Action Buttons -->
            <div style=${styles.buttonRow}>
                <button onClick=${downloadReport}>
                    Download Report (.md)
                </button>
            </div>
        </div>
    `;
}
