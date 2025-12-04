import React, { useState, useEffect } from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(React.createElement);

export function CatalogBrowser({ onSelectTable }) {
    const [catalogs, setCatalogs] = useState([]);
    const [expandedCatalogs, setExpandedCatalogs] = useState({});
    const [expandedSchemas, setExpandedSchemas] = useState({});
    const [schemas, setSchemas] = useState({});
    const [tables, setTables] = useState({});
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableInfo, setTableInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMockData, setIsMockData] = useState(false);

    useEffect(() => {
        fetchCatalogs();
    }, []);

    const fetchCatalogs = async () => {
        try {
            const res = await fetch('/api/catalogs');
            const data = await res.json();
            setCatalogs(data.catalogs || []);
            setIsMockData(data.mock === true);
        } catch (err) {
            console.error('Failed to fetch catalogs:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleCatalog = async (catalogName) => {
        const isExpanded = expandedCatalogs[catalogName];
        setExpandedCatalogs({ ...expandedCatalogs, [catalogName]: !isExpanded });

        if (!isExpanded && !schemas[catalogName]) {
            try {
                const res = await fetch(`/api/catalogs/${catalogName}/schemas`);
                const data = await res.json();
                setSchemas({ ...schemas, [catalogName]: data.schemas || [] });
            } catch (err) {
                console.error('Failed to fetch schemas:', err);
            }
        }
    };

    const toggleSchema = async (catalogName, schemaName) => {
        const key = `${catalogName}.${schemaName}`;
        const isExpanded = expandedSchemas[key];
        setExpandedSchemas({ ...expandedSchemas, [key]: !isExpanded });

        if (!isExpanded && !tables[key]) {
            try {
                const res = await fetch(`/api/catalogs/${catalogName}/schemas/${schemaName}/tables`);
                const data = await res.json();
                setTables({ ...tables, [key]: data.tables || [] });
            } catch (err) {
                console.error('Failed to fetch tables:', err);
            }
        }
    };

    const selectTable = async (catalogName, schemaName, tableName) => {
        const key = `${catalogName}.${schemaName}.${tableName}`;
        setSelectedTable(key);

        try {
            const res = await fetch(`/api/catalogs/${catalogName}/schemas/${schemaName}/tables/${tableName}`);
            const data = await res.json();
            setTableInfo(data);
        } catch (err) {
            console.error('Failed to fetch table info:', err);
        }
    };

    const styles = {
        container: {
            display: 'grid',
            gridTemplateColumns: window.innerWidth > 900 ? '350px 1fr' : '1fr',
            gap: '24px',
            minHeight: window.innerWidth > 900 ? '500px' : 'auto'
        },
        treePanel: {
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #d0d5dd',
            overflowY: 'auto',
            maxHeight: '600px'
        },
        detailPanel: {
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #d0d5dd'
        },
        treeItem: {
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: '6px',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9375rem',
            transition: 'background-color 0.15s ease'
        },
        treeItemHover: {
            backgroundColor: '#e9ecef'
        },
        icon: {
            width: '18px',
            textAlign: 'center',
            flexShrink: 0
        },
        badge: {
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '0.75rem',
            fontWeight: '600',
            marginLeft: 'auto'
        },
        columnRow: {
            display: 'grid',
            gridTemplateColumns: '1fr 120px 80px',
            gap: '12px',
            padding: '12px 16px',
            borderBottom: '1px solid #e9ecef',
            fontSize: '0.9375rem'
        },
        columnHeader: {
            fontWeight: '600',
            color: '#111111',
            backgroundColor: '#f5f7fa',
            borderRadius: '6px 6px 0 0'
        },
        mockBanner: {
            padding: '12px 16px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.875rem',
            color: '#664d03'
        }
    };

    const getTypeColor = (typeName) => {
        const colors = {
            'STRING': '#0066CC',
            'LONG': '#008060',
            'INT': '#008060',
            'DOUBLE': '#9933CC',
            'FLOAT': '#9933CC',
            'BOOLEAN': '#CC9900',
            'TIMESTAMP': '#CC3300',
            'DATE': '#CC3300'
        };
        return colors[typeName] || '#666666';
    };

    if (loading) {
        return html`<div className="card"><p>Loading catalogs...</p></div>`;
    }

    return html`
        <div>
            ${isMockData && html`
                <div style=${styles.mockBanner}>
                    <strong>Demo Mode:</strong> Displaying sample catalog structure. Connect to a Unity Catalog-enabled workspace for live data.
                </div>
            `}
            
            <div style=${styles.container}>
                <div style=${styles.treePanel}>
                    <h4 style=${{ marginBottom: '16px', color: '#111111' }}>Unity Catalog Explorer</h4>
                    
                    ${catalogs.map(catalog => html`
                        <div key=${catalog.name}>
                            <div 
                                style=${styles.treeItem}
                                onClick=${() => toggleCatalog(catalog.name)}
                                onMouseOver=${(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                                onMouseOut=${(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <span style=${styles.icon}>${expandedCatalogs[catalog.name] ? '📂' : '📁'}</span>
                                <span style=${{ fontWeight: '600', color: '#111111' }}>${catalog.name}</span>
                                <span style=${{ ...styles.badge, backgroundColor: '#e9ecef', color: '#444444' }}>catalog</span>
                            </div>
                            
                            ${expandedCatalogs[catalog.name] && schemas[catalog.name] && html`
                                <div style=${{ marginLeft: '20px' }}>
                                    ${schemas[catalog.name].map(schema => html`
                                        <div key=${schema.name}>
                                            <div 
                                                style=${styles.treeItem}
                                                onClick=${() => toggleSchema(catalog.name, schema.name)}
                                                onMouseOver=${(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                                                onMouseOut=${(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <span style=${styles.icon}>${expandedSchemas[`${catalog.name}.${schema.name}`] ? '📂' : '📁'}</span>
                                                <span style=${{ color: '#111111' }}>${schema.name}</span>
                                                <span style=${{ ...styles.badge, backgroundColor: '#d4edda', color: '#008060' }}>schema</span>
                                            </div>
                                            
                                            ${expandedSchemas[`${catalog.name}.${schema.name}`] && tables[`${catalog.name}.${schema.name}`] && html`
                                                <div style=${{ marginLeft: '20px' }}>
                                                    ${tables[`${catalog.name}.${schema.name}`].map(table => html`
                                                        <div 
                                                            key=${table.name}
                                                            style=${{
            ...styles.treeItem,
            backgroundColor: selectedTable === `${catalog.name}.${schema.name}.${table.name}` ? '#cce5ff' : 'transparent'
        }}
                                                            onClick=${() => selectTable(catalog.name, schema.name, table.name)}
                                                            onMouseOver=${(e) => { if (selectedTable !== `${catalog.name}.${schema.name}.${table.name}`) e.currentTarget.style.backgroundColor = '#e9ecef' }}
                                                            onMouseOut=${(e) => { if (selectedTable !== `${catalog.name}.${schema.name}.${table.name}`) e.currentTarget.style.backgroundColor = 'transparent' }}
                                                        >
                                                            <span style=${styles.icon}>${table.table_type === 'VIEW' ? '👁' : '📊'}</span>
                                                            <span style=${{ color: '#111111' }}>${table.name}</span>
                                                            <span style=${{
            ...styles.badge,
            backgroundColor: table.data_source_format === 'DELTA' ? '#cce5ff' : '#f0f2f5',
            color: table.data_source_format === 'DELTA' ? '#0066CC' : '#444444'
        }}>${table.data_source_format || table.table_type}</span>
                                                        </div>
                                                    `)}
                                                </div>
                                            `}
                                        </div>
                                    `)}
                                </div>
                            `}
                        </div>
                    `)}
                </div>
                
                <div style=${styles.detailPanel}>
                    ${!tableInfo && html`
                        <div style=${{ textAlign: 'center', padding: '60px 20px', color: '#666666' }}>
                            <p style=${{ fontSize: '1.125rem', marginBottom: '8px' }}>Select a table to view details</p>
                            <p style=${{ fontSize: '0.875rem' }}>Click on any table in the catalog tree to see its columns and metadata</p>
                        </div>
                    `}
                    
                    ${tableInfo && html`
                        <div>
                            <div style=${{ marginBottom: '24px' }}>
                                <h3 style=${{ fontSize: '1.25rem', marginBottom: '8px', color: '#111111' }}>${tableInfo.full_name}</h3>
                                <p style=${{ color: '#444444', margin: '0 0 16px 0' }}>${tableInfo.comment || 'No description available'}</p>
                                
                                <div style=${{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <span style=${{ ...styles.badge, backgroundColor: '#e9ecef', color: '#444444', padding: '6px 12px' }}>
                                        Type: ${tableInfo.table_type}
                                    </span>
                                    <span style=${{ ...styles.badge, backgroundColor: '#cce5ff', color: '#0066CC', padding: '6px 12px' }}>
                                        Format: ${tableInfo.data_source_format}
                                    </span>
                                    <span style=${{ ...styles.badge, backgroundColor: '#d4edda', color: '#008060', padding: '6px 12px' }}>
                                        Owner: ${tableInfo.owner}
                                    </span>
                                </div>
                            </div>
                            
                            <h4 style=${{ marginBottom: '12px', color: '#111111' }}>Columns (${tableInfo.columns?.length || 0})</h4>
                            <div style=${{ border: '1px solid #d0d5dd', borderRadius: '8px', overflow: 'hidden' }}>
                                <div style=${{ ...styles.columnRow, ...styles.columnHeader }}>
                                    <span>Name</span>
                                    <span>Type</span>
                                    <span>Nullable</span>
                                </div>
                                ${tableInfo.columns?.map((col, idx) => html`
                                    <div key=${idx} style=${{ ...styles.columnRow, backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                                        <span style=${{ fontWeight: '500', color: '#111111' }}>${col.name}</span>
                                        <span style=${{ color: getTypeColor(col.type_name), fontWeight: '500' }}>${col.type_name}</span>
                                        <span style=${{ color: col.nullable ? '#008060' : '#CC3300' }}>${col.nullable ? 'Yes' : 'No'}</span>
                                    </div>
                                `)}
                            </div>
                            
                            <div style=${{ marginTop: '24px' }}>
                                <button 
                                    onClick=${() => onSelectTable && onSelectTable(tableInfo.full_name)}
                                    style=${{
                background: 'linear-gradient(135deg, #0066CC 0%, #004d99 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '1rem'
            }}
                                >
                                    Scan This Table for Data Quality Issues
                                </button>
                            </div>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}
