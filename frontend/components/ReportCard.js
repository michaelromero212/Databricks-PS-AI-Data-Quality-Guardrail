import React from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(React.createElement);

export function ReportCard({ reportPath, analysis }) {
    return html`
        <div>
            <h3>Data Quality Assessment Report</h3>
            <p>A detailed report has been generated based on the analysis.</p>
            
            <div style=${{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px', marginBottom: '20px' }}>
                <strong>Report Location:</strong> <code>${reportPath}</code>
            </div>

            <h4>Executive Summary</h4>
            <p>${analysis.summary}</p>

            <div style=${{ marginTop: '20px' }}>
                <a href="/api/report/latest" target="_blank" style=${{ textDecoration: 'none' }}>
                    <button>Download Full Report (PDF/HTML)</button>
                </a>
            </div>
        </div>
    `;
}
