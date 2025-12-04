import React, { useState, useEffect } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import htm from 'https://esm.sh/htm@3.1.1';
import { DataSelector } from './components/DataSelector.js';
import { DataQualityResults } from './components/DataQualityResults.js';
import { ReportCard } from './components/ReportCard.js';
import { FixItPatchUI } from './components/FixItPatchUI.js';
import { CatalogBrowser } from './components/CatalogBrowser.js';

const html = htm.bind(React.createElement);

function App() {
    const [status, setStatus] = useState('loading');
    const [modelInfo, setModelInfo] = useState('');
    const [scanResult, setScanResult] = useState(null);
    const [activeTab, setActiveTab] = useState('results');
    const [mainView, setMainView] = useState('scanner'); // 'scanner' or 'catalog'
    const [scanPath, setScanPath] = useState('sample');

    useEffect(() => {
        fetch('http://localhost:8000/api/status')
            .then(res => res.json())
            .then(data => {
                setStatus('online');
                setModelInfo(data.model);
            })
            .catch(err => {
                setStatus('offline');
                console.error(err);
            });
    }, []);

    const handleScan = async (path, type) => {
        setStatus('scanning');
        setScanPath(path);
        try {
            const res = await fetch('http://localhost:8000/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, type })
            });
            const data = await res.json();
            setScanResult(data);
            setStatus('complete');
            setMainView('scanner');
            setActiveTab('results');
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    };

    const handleCatalogTableSelect = (tableName) => {
        // Switch to scanner view and trigger a scan on the selected table
        setScanPath(tableName);
        setMainView('scanner');
        handleScan(tableName, 'table');
    };

    const navTabStyle = (isActive) => ({
        padding: '12px 24px',
        fontSize: '1rem',
        fontWeight: '600',
        border: 'none',
        borderBottom: isActive ? '3px solid #0066CC' : '3px solid transparent',
        background: isActive ? '#ffffff' : 'transparent',
        color: isActive ? '#0066CC' : '#444444',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    });

    const subTabStyle = (isActive) => ({
        padding: '10px 20px',
        fontSize: '0.9375rem',
        fontWeight: '500',
        border: 'none',
        borderRadius: '6px',
        background: isActive ? '#0066CC' : '#e9ecef',
        color: isActive ? '#ffffff' : '#444444',
        cursor: isActive ? 'default' : 'pointer',
        transition: 'all 0.2s ease'
    });

    return html`
        <div className="container">
            <header>
                <div>
                    <h1>Databricks PS Data Quality Guardrail</h1>
                    <small style=${{ color: '#ffffff', opacity: 1 }}>AI-Powered Data Reliability for Professional Services</small>
                </div>
                <div style=${{ textAlign: 'right' }}>
                    <div className="status-badge ${status === 'online' || status === 'complete' ? 'status-good' : 'status-warning'}">
                        System: ${status.toUpperCase()}
                    </div>
                    <div style=${{ fontSize: '0.875rem', marginTop: '8px', color: '#ffffff', opacity: 0.9 }}>
                        Model: ${modelInfo}
                    </div>
                </div>
            </header>

            <!-- Main Navigation Tabs -->
            <div style=${{
            display: 'flex',
            gap: '4px',
            marginBottom: '24px',
            borderBottom: '1px solid #d0d5dd',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px 8px 0 0',
            padding: '0 8px'
        }}>
                <button 
                    onClick=${() => setMainView('scanner')} 
                    style=${navTabStyle(mainView === 'scanner')}
                >
                    Data Quality Scanner
                </button>
                <button 
                    onClick=${() => setMainView('catalog')} 
                    style=${navTabStyle(mainView === 'catalog')}
                >
                    Unity Catalog Browser
                </button>
            </div>

            <!-- Scanner View -->
            ${mainView === 'scanner' && html`
                <div>
                    <${DataSelector} onScan=${handleScan} disabled=${status === 'scanning'} defaultPath=${scanPath} />

                    ${scanResult && html`
                        <div className="card">
                            <div style=${{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                                <button onClick=${() => setActiveTab('results')} style=${subTabStyle(activeTab === 'results')}>Results</button>
                                <button onClick=${() => setActiveTab('report')} style=${subTabStyle(activeTab === 'report')}>Report</button>
                                <button onClick=${() => setActiveTab('fixit')} style=${subTabStyle(activeTab === 'fixit')}>Fix-It Generator</button>
                            </div>

                            ${activeTab === 'results' && html`
                                <${DataQualityResults} results=${scanResult.results} analysis=${scanResult.analysis} />
                            `}

                            ${activeTab === 'report' && html`
                                <${ReportCard} reportPath=${scanResult.report_path} analysis=${scanResult.analysis} scanId=${scanResult.scan_id} />
                            `}

                            ${activeTab === 'fixit' && html`
                                <${FixItPatchUI} scanId=${scanResult.scan_id} />
                            `}
                        </div>
                    `}
                </div>
            `}

            <!-- Catalog Browser View -->
            ${mainView === 'catalog' && html`
                <div className="card">
                    <${CatalogBrowser} onSelectTable=${handleCatalogTableSelect} />
                </div>
            `}
        </div>
    `;
}


const root = createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
