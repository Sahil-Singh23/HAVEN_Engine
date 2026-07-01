export interface LoadedTileset {
  image: HTMLImageElement;
  tilewidth: number;
  tileheight: number;
  columns: number;
  firstgid: number;
  name: string;
}

export async function loadTileset(
  sourcePath: string,
  baseUrl: string = '/maps/'
): Promise<LoadedTileset> {
  const jsonPath = baseUrl + sourcePath;
  
  const response = await fetch(jsonPath);
  if (!response.ok) throw new Error(`Failed to load tileset: ${jsonPath}`);
  
  const data = await response.json();
  
  // Image path is relative to tileset JSON location
  const folder = sourcePath.substring(0, sourcePath.lastIndexOf('/') + 1);
  
  // Extract the filename from the image path in case the path is malformed or escapes bounds
  const lastSlashIndex = Math.max(data.image.lastIndexOf('/'), data.image.lastIndexOf('\\'));
  const filename = lastSlashIndex !== -1 ? data.image.substring(lastSlashIndex + 1) : data.image;
  
  // If the path contains relative traversal that could escape the public assets or base directory,
  // we fall back to loading the image from the same directory as the tileset JSON.
  let imagePath = baseUrl + folder + data.image;
  if (data.image.includes('../') || data.image.includes('..\\')) {
    imagePath = baseUrl + folder + filename;
  }
  
  const image = new Image();
  image.src = imagePath;
  
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));
  });
  
  return {
    image,
    tilewidth: data.tilewidth,
    tileheight: data.tileheight,
    columns: data.columns,
    firstgid: data.firstgid,
    name: data.name,
  };
}