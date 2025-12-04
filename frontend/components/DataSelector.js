import React, { useState } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(React.createElement);

export function DataSelector({ onScan, disabled }) {
    const [path, setPath] = useState('sample');
    const [type, setType] = useState('file');

    const handleSubmit = (e) => {
        e.preventDefault();
        onScan(path, type);
    };

    return html`
        <div className="card">
            <h3 style=${{ marginBottom: '20px', fontSize: '1.25rem', color: '#111111' }}>Select Data Source</h3>
            <form onSubmit=${handleSubmit}>
                <div style=${{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '16px', marginBottom: '16px' }}>
                    <div>
                        <label style=${{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#111111' }}>DBFS Path or Table Name</label>
                        <input 
                            type="text" 
                            value=${path} 
                            onChange=${(e) => setPath(e.target.value)} 
                            placeholder="dbfs:/mnt/data/file.csv or default.table_name"
                            style=${{ marginBottom: 0, width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style=${{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#111111' }}>Type</label>
                        <select 
                            value=${type} 
                            onChange=${(e) => setType(e.target.value)}
                            style=${{ marginBottom: 0, width: '100%' }}
                        >
                            <option value="file">File (CSV/Parquet)</option>
                            <option value="table">Delta Table</option>
                        </select>
                    </div>
                </div>
                <div style=${{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
                    <small style=${{ color: '#444444', fontSize: '0.9rem' }}>Tip: Use "sample" to test with mock data.</small>
                    <button 
                        type="submit" 
                        disabled=${disabled}
                        style=${{
            padding: '12px 28px',
            fontSize: '1rem',
            fontWeight: '600',
            minWidth: '180px'
        }}
                    >
                        ${disabled ? 'Scanning...' : 'Run Quality Scan'}
                    </button>
                </div>
            </form>
        </div>
    `;
}
