const fileSystemPromises = require('fs/promises');
const fileSystem = require('fs');
const path = require('path');
const xmlToJson = require('xml2json');

const ncmsPaper = ['47', '48', '49'];
const ncmsPlastic = ['39', '40'];
const ncmsGlass = ['70'];
const ncmsMetal = ['72', '73', '74', '75', '76', '78', '79', '80', '81', '82', '83'];

fileSystemPromises.readdir(path.join(__dirname, 'nfe_container')).then((files) => {
  files.forEach((file) => {
    if (file.endsWith('.xml')) {
      fileSystemPromises.readFile(path.join(__dirname, 'nfe_container', file), 'utf8').then(async (content) => {
        try {
          const jsonString = await xmlToJson.toJson(content)
          const nfeFile = JSON.parse(jsonString);

          if (!nfeFile.nfeProc) return fileSystemPromises.unlink(path.join(__dirname, 'nfe_container', file));

          const businessName = nfeFile.nfeProc.NFe.infNFe.emit.xNome.split(' ').join('_');
          const ncms = nfeFile.nfeProc.NFe.infNFe.det.length > 1 ? nfeFile.nfeProc.NFe.infNFe.det.map((item) => item.prod.NCM) : [nfeFile.nfeProc.NFe.infNFe.det.prod.NCM];
          const typeNfe = nfeFile.nfeProc.NFe.infNFe.ide.tpNF === '0' ? 'entrada' : 'saida';

          if (!fileSystem.existsSync(path.join(__dirname, 'nfes_processed', businessName))) await fileSystem.mkdirSync(path.join(__dirname, 'nfes_processed', businessName), { recursive: true });

          const material = getMaterialTypeName(ncms);
          const typeDocument = nfeFile.nfeProc.NFe.infNFe.dest.CPF ? 'cpf' : 'cnpj';
          const yearEmit = nfeFile.nfeProc.NFe.infNFe.ide.dhEmi.substring(0, 4);

          if (!fileSystem.existsSync(path.join(__dirname, 'nfes_processed', businessName, material))) {
            await fileSystem.mkdirSync(path.join(__dirname, 'nfes_processed', businessName, material), { recursive: true });
          }

          if (!fileSystem.existsSync(path.join(__dirname, 'nfes_processed', businessName, material, typeNfe))) {
            await fileSystem.mkdirSync(path.join(__dirname, 'nfes_processed', businessName, material, typeNfe), { recursive: true });
          }

          if (!fileSystem.existsSync(path.join(__dirname, 'nfes_processed', businessName, material, typeNfe, yearEmit))) {
            await fileSystem.mkdirSync(path.join(__dirname, 'nfes_processed', businessName, material, typeNfe, yearEmit), { recursive: true });
          }

          if (!fileSystem.existsSync(path.join(__dirname, 'nfes_processed', businessName, material, typeNfe, yearEmit, typeDocument))) {
            await fileSystem.mkdirSync(path.join(__dirname, 'nfes_processed', businessName, material, typeNfe, yearEmit, typeDocument), { recursive: true });
          }

          console.table({
            typeDocument,
            yearEmit,
            material,
            businessName,
          })

          await createFile(material, businessName, file, content, typeNfe, typeDocument, yearEmit);

        } catch (error) {
          console.log('Arquivo inválido: ', file);
        }
      });
    }
  });
});

function getMaterialTypeName(ncms) {
  if (ncms.length === 1) {
    return getMaterialNcm(ncms[0])
  } else {
    material = ncms.map((ncm) => getMaterialNcm(ncm));
    return material.join('_');
  }
}

function getMaterialNcm(ncm) {
  if (ncmsPaper.includes(ncm.substring(0, 2))) return 'Papel';
  if (ncmsPlastic.includes(ncm.substring(0, 2))) return 'Plástico';
  if (ncmsGlass.includes(ncm.substring(0, 2))) return 'Vidro';
  if (ncmsMetal.includes(ncm.substring(0, 2))) return 'Metal';
}

async function createFile(material, businessName, file, content, typeNfe, typeDocument, yearEmit) {
  try {
    if (!fileSystem.existsSync(path.join(__dirname, 'nfes_processed', businessName, material, typeNfe, yearEmit, typeDocument, file))) {
      await fileSystemPromises.writeFile(path.join(__dirname, 'nfes_processed', businessName, material, typeNfe, yearEmit, typeDocument, file), content, 'utf8');
    }
    fileSystemPromises.unlink(path.join(__dirname, 'nfe_container', file));
  } catch (error) {
    console.log(error.message);
  }
}