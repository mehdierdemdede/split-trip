import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/** JSON dosyasını önbelleğe yazar ve sistem paylaşımını açar (Drive, Dosyalar, vb.). */
export async function shareJsonDocument(json: string, baseName: string): Promise<void> {
  const dir = cacheDirectory;
  if (!dir) throw new Error('Cache directory is not available.');
  const safe = baseName.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(0, 72) || 'splittrip-backup';
  const uri = `${dir}${safe}.json`;
  await writeAsStringAsync(uri, json, { encoding: EncodingType.UTF8 });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'SplitTrip backup',
  });
}
