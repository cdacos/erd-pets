/**
 * Dual file handle management for diagram and SQL files.
 *
 * @module fileManager
 */

// Re-export utilities from file.js
export { saveToFile, isFileSystemAccessSupported } from './file.js';

/**
 * Open a diagram file picker (.erd-pets.json).
 * @returns {Promise<{handle: FileSystemFileHandle, content: string}>}
 * @throws {Error} If the API is not supported or the user cancels
 */
export async function openDiagramFile() {
  if (!('showOpenFilePicker' in window)) {
    throw new Error(
      'File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.'
    );
  }

  const [handle] = await window.showOpenFilePicker({
    types: [
      {
        description: 'ERD-Pets Diagram Files',
        accept: { 'application/json': ['.json'] },
      },
    ],
    multiple: false,
  });

  const file = await handle.getFile();
  const content = await file.text();

  return { handle, content };
}

/**
 * Open a SQL file picker.
 * @param {FileSystemFileHandle} [startInHandle] - Optional handle to start picker in same directory
 * @returns {Promise<{handle: FileSystemFileHandle, content: string}>}
 * @throws {Error} If the API is not supported or the user cancels
 */
export async function openSqlFile(startInHandle) {
  if (!('showOpenFilePicker' in window)) {
    throw new Error(
      'File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.'
    );
  }

  const [handle] = await window.showOpenFilePicker({
    types: [
      {
        description: 'SQL Files',
        accept: { 'text/plain': ['.sql'] },
      },
    ],
    multiple: false,
    ...(startInHandle ? { startIn: startInHandle } : {}),
  });

  const file = await handle.getFile();
  const content = await file.text();

  return { handle, content };
}

/**
 * Save a new diagram file using the save file picker.
 * @param {string} content - The content to write
 * @param {FileSystemFileHandle} [startInHandle] - Optional handle to start picker in same directory
 * @returns {Promise<FileSystemFileHandle>}
 * @throws {Error} If the API is not supported or the user cancels
 */
export async function saveNewDiagramFile(content, startInHandle) {
  if (!('showSaveFilePicker' in window)) {
    throw new Error(
      'File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.'
    );
  }

  const handle = await window.showSaveFilePicker({
    suggestedName: 'diagram.erd-pets.json',
    types: [
      {
        description: 'ERD-Pets Diagram Files',
        accept: { 'application/json': ['.json'] },
      },
    ],
    ...(startInHandle ? { startIn: startInHandle } : {}),
  });

  const writable = await handle.createWritable();
  try {
    await writable.write(content);
  } finally {
    await writable.close();
  }

  return handle;
}

/**
 * Refresh content from both file handles.
 * @param {FileSystemFileHandle} diagramHandle
 * @param {FileSystemFileHandle} sqlHandle
 * @returns {Promise<{diagramContent: string, sqlContent: string}>}
 */
export async function refreshFiles(diagramHandle, sqlHandle) {
  const [diagramFile, sqlFile] = await Promise.all([
    diagramHandle.getFile(),
    sqlHandle.getFile(),
  ]);

  const [diagramContent, sqlContent] = await Promise.all([
    diagramFile.text(),
    sqlFile.text(),
  ]);

  return { diagramContent, sqlContent };
}
