import fs from 'fs';
import path from 'path';
import tmp from 'tmp';

describe('download', () => {
  let tmpDir: tmp.DirResult;

  beforeEach(() => { tmpDir = tmp.dirSync({unsafeCleanup : true}); });
  afterEach(() => tmpDir.removeCallback());

  it('extracts a zip file',
     async () => {
         // const fileZipPath = path.join(tmpobj.name, 'file.zip');
         // fs.writeFileSync(fileZipPath, fileZip);
         // await extract(fileZipPath, { dir: tmpobj.name });
         // expect(fs.readFileSync(path.join(tmpobj.name, '/file/file.txt'),
         // 'utf8'))
         //     .toEqual(fileTxt);
     });
})
