// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth_context';
import {
  getSolidDataset,
  getContainedResourceUrlAll,
  createContainerAt,
  saveSolidDatasetAt,
  createSolidDataset,
  buildThing,
  createThing,
  setThing,
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
  file: {
    name: string;
    url: string;
  };
  onClose: () => void;
  content: string;
}

interface CreateItemForm {
  name: string;
  type: 'folder' | 'file';
  content?: string;
}

interface TurtleData {
  type?: string;
  properties: {
    [key: string]: string | string[];
  };
}

// Função para parser genérico de conteúdo Turtle
const parseTurtleContent = (content: string): TurtleData | null => {
  try {
    const data: TurtleData = {
      properties: {}
    };

    // Detecta o tipo (a)
    const typeMatch = content.match(/a\s+<([^>]+)>/);
    if (typeMatch) {
      data.type = typeMatch[1];
    }

    // Encontra todas as propriedades e seus valores
    const propertyPattern = /<([^>]+)>\s*"([^"]+)"|<([^>]+)>\s+([^;\s]+)/g;
    let match;

    while ((match = propertyPattern.exec(content)) !== null) {
      const predicate = match[1] || match[3];
      const value = match[2] || match[4];

      // Simplifica o nome da propriedade
      const propertyName = predicate.split('/').pop() || predicate;

      // Se a propriedade já existe, converte para array
      if (data.properties[propertyName]) {
        if (Array.isArray(data.properties[propertyName])) {
          (data.properties[propertyName] as string[]).push(value);
        } else {
          data.properties[propertyName] = [data.properties[propertyName] as string, value];
        }
      } else {
        data.properties[propertyName] = value;
      }
    }

    return data;
  } catch (error) {
    console.error('Error parsing Turtle data:', error);
    return null;
  }
};

const PropertyRenderer: React.FC<{ name: string; value: string | string[] }> = ({ name, value }) => {
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

const renderValue = (val: string) => {
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
};

return (
  <div className="property-item">
    <strong>{name}:</strong>
    <div className="property-value">
      {Array.isArray(value) ? (
        <ul>
          {value.map((val, index) => (
            <li key={index}>{renderValue(val)}</li>
          ))}
        </ul>
      ) : (
        renderValue(value)
      )}
    </div>
  </div>
);
};

const FileViewer: React.FC<FileViewerProps> = ({ file, onClose, content }) => {
  const isImage = file.url.match(/\.(jpg|jpeg|png|gif)$/i);
  const isTurtle = content.includes('@prefix') || content.includes('schema.org') || content.includes('<http');
  
  const turtleData = isTurtle ? parseTurtleContent(content) : null;

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
              {turtleData.type && (
                <div className="data-type">
                  Type: {turtleData.type.split('/').pop()}
                </div>
              )}
              <div className="properties-container">
                {Object.entries(turtleData.properties).map(([key, value]) => (
                  <PropertyRenderer key={key} name={key} value={value} />
                ))}
              </div>
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

  const getPodBaseUrl = (): string | null => {
    if (!session.webId) return null;

    console.log(session.webId)

    return 'https://storage.inrupt.com/33bc24fb-1bb8-4d9e-9139-fdf2486999ee/';
  };

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
    const podBaseUrl = getPodBaseUrl();
    if (podBaseUrl) {
      loadFolderContent(podBaseUrl);
      setPath([podBaseUrl]);
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
          .addStringNoLocale('https://storage.inrupt.com/33bc24fb-1bb8-4d9e-9139-fdf2486999ee/', createItemForm.content || '')
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