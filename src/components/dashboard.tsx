// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth_context';
import {
  getContainedResourceUrlAll,
  createContainerAt,
  saveSolidDatasetAt,
  createSolidDataset,
  buildThing,
  createThing,
  setThing,
  getSolidDataset,
  getThing,
  getUrl
} from '@inrupt/solid-client';
import '../styles/dashboard.css';

interface FolderContent {
  name: string;
  url: string;
  items: Array<{
    name: string;
    url: string;
    isFolder: boolean;
  }>;
}

interface FileViewerProps {
  file: { url: string; name: string };
  onClose: () => void;
  content: string;
}

interface CreateItemForm {
  name: string;
  type: 'folder' | 'file';
  content?: string;
}

interface TurtleData {
  subject: string;
  types: string[];
  properties: { [key: string]: string | string[] | TurtleData[] };
}

interface PropertyRendererProps {
  name: string;
  value: string | string[] | TurtleData[];
}

const parseTurtleBlocks = (content: string): TurtleData[] => {
  const blocks = content.split(/(?<=\.)\s*(?=<)/);
  const dataArray: TurtleData[] = [];

  blocks.forEach(block => {
    const lines = block.trim().split(/\n/).map(line => line.trim()).filter(Boolean);

    // Extrair sujeito na 1ª linha
    const subjectMatch = lines[0].match(/^<([^>]+)>/);
    if (!subjectMatch) return; // pular blocos inválidos
    const subject = subjectMatch[1];

    // Extrair tipos (a ...)
    const typeLine = lines.find(l => l.startsWith('a '));
    let types: string[] = [];
    if (typeLine) {
      // Remove 'a ' e split por ',' ou ';'
      const typeStr = typeLine.replace(/^a\s+/, '').replace(';', '').trim();
      types = typeStr.split(/\s*,\s*/);
    }

    // Extrair propriedades restantes
    const properties: { [key: string]: string | string[] } = {};
    lines.forEach(line => {
      if (line.startsWith('a ')) return;
      // Exemplo: schema:name "Projects Name" ;
      const propMatch = line.match(/([^:]+:[^ ]+)\s+("[^"]+"|<[^>]+>)/);
      if (propMatch) {
        const prop = propMatch[1].trim();
        let val = propMatch[2].trim();
        // Limpar aspas ou <>
        if (val.startsWith('"')) val = val.slice(1,-1);
        if (val.startsWith('<')) val = val.slice(1,-1);

        if (properties[prop]) {
          if (Array.isArray(properties[prop])) {
            properties[prop].push(val);
          } else {
            properties[prop] = [properties[prop], val];
          }
        } else {
          properties[prop] = val;
        }
      }
    });

    dataArray.push({ subject, types, properties });
  });

  return dataArray;
};

const PropertyRenderer: React.FC<PropertyRendererProps> = ({ name, value }) => {
  // Função para verificar se é uma URL
  const isUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  // Função para formatar datas
  const formatDate = (dateStr: string) => {
    try {
      if (dateStr.includes('XMLSchema#dateTime')) {
        dateStr = dateStr.split('"')[1];
      }
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  // Renderiza o valor (recursivo para objetos TurtleData)
  const renderValue = (val: string | TurtleData) => {
    if (typeof val === 'string') {
      if (isUrl(val)) {
        if (val.match(/\.(jpg|jpeg|png|gif)$/i)) {
          return <img src={val} alt={name} className="property-image" />;
        }
        return <a href={val} target="_blank" rel="noopener noreferrer">{val}</a>;
      }

      if (val.includes('XMLSchema#dateTime')) {
        return formatDate(val);
      }

      return val;
    } else {
      // é TurtleData: renderiza tipos e propriedades recursivamente
      return (
        <div className="nested-turtle-data" style={{ marginLeft: '1em', borderLeft: '2px solid #ccc', paddingLeft: '1em' }}>
          {val.types && val.types.length > 0 && (
            <div><strong>Type{val.types.length > 1 ? 's' : ''}:</strong> {val.types.map(t => t.split('/').pop()).join(', ')}</div>
          )}
          {Object.entries(val.properties).map(([k, v]) => (
            <PropertyRenderer key={k} name={k} value={v} />
          ))}
        </div>
      );
    }
  };

  if (Array.isArray(value)) {
    // Pode ser array de strings ou array de TurtleData
    if (value.length > 0 && typeof value[0] === 'object' && 'properties' in value[0]) {
      // Array de TurtleData
      return (
        <div className="property-item">
          <strong>{name}:</strong>
          <div className="property-value">
            {value.map((item, idx) => (
              <div key={item.subject || idx} className="nested-block" style={{ marginBottom: '0.5em' }}>
                {renderValue(item)}
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      // Array de strings
      return (
        <div className="property-item">
          <strong>{name}:</strong>
          <ul className="property-value">
            {value.map((val, index) => (
              <li key={index}>{renderValue(val)}</li>
            ))}
          </ul>
        </div>
      );
    }
  }

  // valor simples string
  return (
    <div className="property-item">
      <strong>{name}:</strong>
      <div className="property-value">{renderValue(value)}</div>
    </div>
  );
};

const FileViewer: React.FC<FileViewerProps> = ({ file, onClose, content }) => {
  const isImage = /\.(jpg|jpeg|png|gif)$/i.test(file.url);
  const isTurtle = content.includes('@prefix') || content.includes('schema:') || content.includes('<http');

  // parseTurtleBlocks retorna TurtleData[]
  const turtleData = isTurtle ? parseTurtleBlocks(content) : null;

  return (
    <div className="file-viewer-overlay">
      <div className="file-viewer">
        <div className="file-viewer-header">
          <h3>{file.name}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        <div className="file-viewer-content">
          {isImage ? (
            <img src={file.url} alt={file.name} className="full-image" />
          ) : isTurtle && turtleData ? (
            <div className="turtle-data">
              {turtleData.map(({ subject, types, properties }, index) => (
                <div key={subject || index} className="turtle-block" style={{ marginBottom: '1em' }}>
                  {types && types.length > 0 && (
                    <div className="data-types">
                      <strong>Type{types.length > 1 ? 's' : ''}:</strong> {types.map(t => t.split('/').pop()).join(', ')}
                    </div>
                  )}
                  <div className="properties-container">
                    {Object.entries(properties).map(([key, value]) => (
                      <PropertyRenderer key={key} name={key} value={value} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <pre>{content}</pre>
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [currentFolder, setCurrentFolder] = useState<FolderContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createItemForm, setCreateItemForm] = useState<CreateItemForm>({
    name: '',
    type: 'folder',
    content: ''
  });

  const [openFile, setOpenFile] = useState<{ name: string; url: string } | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [podInfo, setPodInfo] = useState<PodInfo | null>(null);

  const getPodBaseUrl = async (): Promise<string | null> => {
    if (!session.webId || !session.fetch) return null;
  
    try {
      // Método 2: Tentar extrair do WebID profile
      const profileDataset = await getSolidDataset(session.webId, { fetch: session.fetch });
      const profile = getThing(profileDataset, session.webId);
      
      if (profile) {
        // Tentar diferentes predicados comuns para storage
        const storage = getUrl(profile, 'http://www.w3.org/ns/pim/space#storage') ||
                       getUrl(profile, 'http://www.w3.org/ns/solid/terms#storageSpace');
        
        if (storage) return storage;
      }
  
      // Método 3: Tentar derivar do WebID
      // Exemplo: https://username.inrupt.net/profile/card#me -> https://username.inrupt.net/
      const webIdUrl = new URL(session.webId);
      const baseUrl = `${webIdUrl.protocol}//${webIdUrl.hostname}/`;
      
      // Verificar se o baseUrl é acessível
      try {
        await session.fetch(baseUrl);
        return baseUrl;
      } catch {
        // Se não for acessível, não retornar
      }
  
      console.warn('Could not determine POD URL');
      return null;
  
    } catch (error) {
      console.error('Error getting pod URL:', error);
      return null;
    }
  };
  
  // Interface para armazenar informações do POD
  interface PodInfo {
    baseUrl: string;
    provider: string;
    username: string;
  }
  
  // Função para extrair informações detalhadas do POD
  const getPodInfo = async (): Promise<PodInfo | null> => {
    const podUrl = await getPodBaseUrl();
    if (!podUrl) return null;
  
    try {
      const url = new URL(podUrl);
      
      // Determinar o provedor
      let provider = 'unknown';
      if (url.hostname.includes('inrupt.com')) {
        provider = 'Inrupt';
      } else if (url.hostname.includes('solidcommunity.net')) {
        provider = 'Solid Community';
      }
  
      // Extrair username do hostname ou path
      const username = url.hostname.split('.')[0] || 
                      url.pathname.split('/')[1] || 
                      'unknown';
  
      return {
        baseUrl: podUrl,
        provider,
        username
      };
    } catch (error) {
      console.error('Error parsing pod info:', error);
      return null;
    }
  };

  const handleFileOpen = async (item: { name: string; url: string }) => {
    if (!session.fetch) return;

    setLoading(true);
    try {
      const response = await session.fetch(item.url);
      const content = await response.text();
      setFileContent(content);
      setOpenFile(item);
    } catch (err) {
      setError(`Failed to open file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getFolderNameFromUrl = (url: string): string => {
    const parts = url.split('/');
    while (parts.length > 0 && !parts[parts.length - 1]) {
      parts.pop();
    }
    return parts[parts.length - 1] || 'Root';
  };

  // const getPodBaseUrl = async (): Promise<string | null> => {
  //   if (!session.webId || !session.fetch) return null;

  //   try {
  //     // Obtém todos os storages associados ao WebID
  //     const storages = await getStorageAll(session.webId, { fetch: session.fetch });

  //     // Pega o primeiro storage (geralmente é o principal)
  //     const podUrl = storages[0];

  //     console.log('Pod URL:', podUrl);
  //     return podUrl;
  //   } catch (error) {
  //     console.error('Error getting pod URL:', error);
  //     return null;
  //   }
  // };

  const loadFolderContent = async (folderUrl: string) => {
    if (!session.fetch) {
      setError('No authenticated fetch available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching folder:', folderUrl);

      const dataset = await getSolidDataset(folderUrl, {
        fetch: session.fetch
      });

      console.log('Dataset fetched:', dataset);

      const containedResources = getContainedResourceUrlAll(dataset);
      console.log('Contained resources:', containedResources);

      const items = await Promise.all(
        containedResources.map(async (resourceUrl) => {
          try {
            const isFolder = resourceUrl.endsWith('/');
            const name = getFolderNameFromUrl(resourceUrl);

            return {
              name,
              url: resourceUrl,
              isFolder
            };
          } catch (error) {
            console.warn(`Error processing resource ${resourceUrl}:`, error);
            return null;
          }
        })
      );

      const validItems = items
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => {
          // Ordenar pastas primeiro, depois arquivos
          if (a.isFolder && !b.isFolder) return -1;
          if (!a.isFolder && b.isFolder) return 1;
          return a.name.localeCompare(b.name);
        });

      setCurrentFolder({
        name: getFolderNameFromUrl(folderUrl),
        url: folderUrl,
        items: validItems
      });

    } catch (err) {
      console.error('Error loading folder:', err);
      setError(`Failed to load folder: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializePod = async () => {
      const info = await getPodInfo();
      if (info) {
        setPodInfo(info);
        loadFolderContent(info.baseUrl);
        setPath([info.baseUrl]);
      }
    };

    if (session.webId && session.fetch) {
      initializePod();
    }
  }, [session.webId, session.fetch]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      setError('Failed to logout');
    }
  };

  const handleFolderClick = (url: string) => {
    setPath(prev => [...prev, url]);
    loadFolderContent(url);
  };

  const handleBackClick = () => {
    if (path.length > 1) {
      const newPath = [...path];
      newPath.pop();
      const previousUrl = newPath[newPath.length - 1];
      setPath(newPath);
      loadFolderContent(previousUrl);
    }
  };

  const handleRefresh = () => {
    if (currentFolder) {
      loadFolderContent(currentFolder.url);
    }
  };

  const handleCreateItem = async () => {
    const info = await getPodInfo();
    if (!session.fetch || !currentFolder) {
      setError('No active session or current folder');
      return;
    }

    if (!createItemForm.name) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newItemUrl = `${currentFolder.url}${createItemForm.name}${createItemForm.type === 'folder' ? '/' : ''
        }`;

      if (createItemForm.type === 'folder') {
        await createContainerAt(newItemUrl, { fetch: session.fetch });
      } else {
        const newDataset = createSolidDataset();
        const thing = buildThing(createThing())
          .addStringNoLocale(info!.baseUrl, createItemForm.content || '')
          .build();

        console.log(thing)

        const datasetWithThing = setThing(newDataset, thing);
        await saveSolidDatasetAt(newItemUrl, datasetWithThing, { fetch: session.fetch });
      }

      await loadFolderContent(currentFolder.url);
      setShowCreateForm(false);
      setCreateItemForm({ name: '', type: 'folder', content: '' });

    } catch (err) {
      console.error('Error creating item:', err);
      setError(`Failed to create ${createItemForm.type}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const CreateItemForm = () => (
    <div className="create-form-overlay" onClick={() => setShowCreateForm(false)}>
      <div className="create-form" onClick={e => e.stopPropagation()}>
        <h3>Create New {createItemForm.type === 'folder' ? 'Folder' : 'File'}</h3>

        <div className="form-group">
          <label>Type:</label>
          <select
            value={createItemForm.type}
            onChange={(e) => setCreateItemForm(prev => ({
              ...prev,
              type: e.target.value as 'folder' | 'file'
            }))}
          >
            <option value="folder">Folder</option>
            <option value="file">File</option>
          </select>
        </div>

        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            value={createItemForm.name}
            onChange={(e) => setCreateItemForm(prev => ({
              ...prev,
              name: e.target.value
            }))}
            placeholder={`Enter ${createItemForm.type} name`}
          />
        </div>

        {createItemForm.type === 'file' && (
          <div className="form-group">
            <label>Content:</label>
            <textarea
              value={createItemForm.content}
              onChange={(e) => setCreateItemForm(prev => ({
                ...prev,
                content: e.target.value
              }))}
              placeholder="Enter file content"
            />
          </div>
        )}

        <div className="form-actions">
          <button
            onClick={handleCreateItem}
            disabled={!createItemForm.name || loading}
            className="create-button"
          >
            Create
          </button>
          <button
            onClick={() => setShowCreateForm(false)}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const renderBreadcrumb = () => (
    <div className="breadcrumb">
      {path.map((url, index) => (
        <React.Fragment key={url}>
          {index > 0 && <span className="breadcrumb-separator">/</span>}
          <button
            className="breadcrumb-item"
            onClick={() => {
              const newPath = path.slice(0, index + 1);
              setPath(newPath);
              loadFolderContent(url);
            }}
          >
            {index === 0 ? 'Root' : getFolderNameFromUrl(url)}
          </button>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-top">
          <h1>POD Explorer</h1>
          <div className="header-actions">
            <button
              onClick={handleRefresh}
              className="refresh-button"
              disabled={loading}
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="create-item-button"
              disabled={loading || !currentFolder}
            >
              ➕ New Item
            </button>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
        <p className="webid-display">WebID: {session.webId}</p>
        {renderBreadcrumb()}
      </div>

      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading content...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {currentFolder && (
        <div className="folder-content">
          {currentFolder.items.length > 0 ? (
            <div className="items-grid">
              {currentFolder.items.map((item, index) => (
                <div key={index} className={`item-card ${item.isFolder ? 'folder' : 'file'}`}>
                  {item.isFolder ? (
                    <button
                      onClick={() => handleFolderClick(item.url)}
                      className="folder-button"
                    >
                      📁 {item.name}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFileOpen(item)}
                      className="file-button"
                    >
                      📄 {item.name}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-folder">This folder is empty</p>
          )}
        </div>
      )}

      {openFile && (
        <FileViewer
          file={openFile}
          onClose={() => setOpenFile(null)}
          content={fileContent}
        />
      )}

      {showCreateForm && <CreateItemForm />}
    </div>
  );
};

export default Dashboard;