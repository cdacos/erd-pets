/**
 * File System Access API service for loading and saving SQL files.
 *
 * @module file
 */

/**
 * Check if the File System Access API is supported.
 * @returns {boolean}
 */
export function isFileSystemAccessSupported() {
  return 'showOpenFilePicker' in window;
}

/**
 * Open a file picker and read the selected SQL file.
 * @returns {Promise<{handle: FileSystemFileHandle, content: string}>}
 * @throws {Error} If the API is not supported or the user cancels
 */
export async function openSqlFile() {
  if (!isFileSystemAccessSupported()) {
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
  });

  const file = await handle.getFile();
  const content = await file.text();

  return { handle, content };
}

/**
 * Save content to a file handle.
 * @param {FileSystemFileHandle} handle - The file handle to write to
 * @param {string} content - The content to write
 * @throws {Error} If writing fails
 */
export async function saveToFile(handle, content) {
  const writable = await handle.createWritable();
  try {
    await writable.write(content);
  } finally {
    await writable.close();
  }
}
