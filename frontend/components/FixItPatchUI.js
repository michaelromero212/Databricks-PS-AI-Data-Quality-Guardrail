import React, { useState } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(React.createElement);

export function FixItPatchUI({ scanId }) {
    const [notebook, setNotebook] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);

    const generatePatch = async () => {
        setLoading(true);
        setUploadResult(null);
        try {
            const res = await fetch('http://localhost:8000/api/generate-fixit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scan_id: scanId })
            });
            const data = await res.json();
            setNotebook(data);
        } catch (err) {
            console.error(err);
            alert('Failed to generate patch');
        } finally {
            setLoading(false);
        }
    };

    const uploadToDatabricks = async () => {
        setUploading(true);
        try {
            const res = await fetch('http://localhost:8000/api/upload-notebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scan_id: scanId })
            });
            const data = await res.json();
            setUploadResult(data);
        } catch (err) {
            console.error(err);
            setUploadResult({ error: err.message || 'Upload failed' });
        } finally {
            setUploading(false);
        }
    };

    const buttonStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 24px',
        fontSize: '1rem',
        fontWeight: '600',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minHeight: '48px'
    };

    return html`
        <div>
            <div style=${{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px'
        }}>
                <h3 style=${{ fontSize: '1.25rem', color: '#111111', margin: 0 }}>Fix-It Patch Generator</h3>
                <button 
                    onClick=${generatePatch} 
                    disabled=${loading}
                    style=${{ ...buttonStyle, background: 'linear-gradient(135deg, #0066CC 0%, #004d99 100%)', color: 'white' }}
                >
                    ${loading ? 'Generating...' : 'Generate Fix-It Notebook'}
                </button>
            </div>

            ${!notebook && html`
                <div style=${{
                padding: '24px',
                backgroundColor: '#f5f7fa',
                borderRadius: '12px',
                border: '1px solid #d0d5dd'
            }}>
                    <h4 style=${{ fontSize: '1.125rem', marginBottom: '16px', color: '#111111' }}>What is this?</h4>
                    <p style=${{ color: '#444444', fontSize: '1rem', lineHeight: '1.6', marginBottom: '16px' }}>
                        Click the button above to generate an auto-remediation notebook containing:
                    </p>
                    <ul style=${{ paddingLeft: '24px', listStyle: 'disc', margin: '0 0 16px 0' }}>
                        <li style=${{ color: '#444444', fontSize: '1rem', marginBottom: '8px', padding: 0, background: 'none', border: 'none' }}>SQL fixes for detected issues</li>
                        <li style=${{ color: '#444444', fontSize: '1rem', marginBottom: '8px', padding: 0, background: 'none', border: 'none' }}>Python data cleaning scripts</li>
                        <li style=${{ color: '#444444', fontSize: '1rem', marginBottom: '0', padding: 0, background: 'none', border: 'none' }}>Delta Lake optimization commands</li>
                    </ul>
                    <p style=${{ marginTop: '16px', color: '#444444', fontSize: '1rem' }}>
                        The notebook will be in <strong style=${{ color: '#111111' }}>Databricks SOURCE format</strong> (.py), 
                        ready to upload to your workspace.
                    </p>
                </div>
            `}

            ${notebook && html`
                <div>
                    <div style=${{
                padding: '20px',
                backgroundColor: '#d4edda',
                border: '1px solid #008060',
                borderRadius: '12px',
                marginBottom: '24px'
            }}>
                        <div style=${{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style=${{ fontSize: '1.25rem' }}>✓</span>
                            <div>
                                <strong style=${{ color: '#111111', fontSize: '1rem' }}>Success!</strong>
                                <span style=${{ color: '#444444', marginLeft: '8px', fontSize: '1rem' }}>Notebook generated locally at:</span>
                                <code style=${{
                marginLeft: '8px',
                padding: '4px 8px',
                background: '#f0f2f5',
                borderRadius: '4px',
                fontSize: '0.9375rem',
                color: '#004d99'
            }}>${notebook.filename}</code>
                            </div>
                        </div>
                    </div>
                    
                    <div style=${{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                        <button 
                            onClick=${uploadToDatabricks} 
                            disabled=${uploading}
                            style=${{ ...buttonStyle, background: 'linear-gradient(135deg, #008060 0%, #006650 100%)', color: 'white' }}
                        >
                            ${uploading ? 'Uploading...' : 'Upload to Databricks Workspace'}
                        </button>
                    </div>

                    ${uploadResult && !uploadResult.error && html`
                        <div style=${{
                    padding: '20px',
                    backgroundColor: '#d4edda',
                    border: '1px solid #008060',
                    borderRadius: '12px',
                    marginBottom: '24px'
                }}>
                            <h4 style=${{ margin: '0 0 12px 0', color: '#111111', fontSize: '1.125rem' }}>Uploaded Successfully!</h4>
                            <p style=${{ margin: '0 0 12px 0', color: '#444444', fontSize: '1rem' }}>
                                <strong style=${{ color: '#111111' }}>Workspace Path:</strong>
                                <code style=${{
                    marginLeft: '8px',
                    padding: '4px 8px',
                    background: '#f0f2f5',
                    borderRadius: '4px',
                    fontSize: '0.9375rem',
                    color: '#004d99'
                }}>${uploadResult.workspace_path}</code>
                            </p>
                            <a 
                                href=${uploadResult.workspace_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style=${{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '8px',
                    padding: '10px 20px',
                    background: '#008060',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '1rem'
                }}
                            >
                                Open in Databricks Workspace
                            </a>
                        </div>
                    `}

                    ${uploadResult && uploadResult.error && html`
                        <div style=${{
                    padding: '20px',
                    backgroundColor: '#f8d7da',
                    border: '1px solid #CC3300',
                    borderRadius: '12px',
                    marginBottom: '24px'
                }}>
                            <strong style=${{ color: '#CC3300', fontSize: '1rem' }}>Upload Failed:</strong>
                            <span style=${{ marginLeft: '8px', color: '#444444', fontSize: '1rem' }}>${uploadResult.error}</span>
                        </div>
                    `}
                    
                    <h4 style=${{ fontSize: '1.125rem', marginBottom: '16px', color: '#111111' }}>Notebook Preview</h4>
                    <pre style=${{
                maxHeight: '400px',
                overflowY: 'auto',
                fontSize: '0.875rem',
                background: '#1e1e1e',
                color: '#d4d4d4',
                padding: '16px',
                borderRadius: '8px',
                lineHeight: '1.6'
            }}>
                        ${notebook.content}
                    </pre>
                </div>
            `}
        </div>
    `;
}
