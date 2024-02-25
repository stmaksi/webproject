import { Express, Request, Response } from 'express';
import AuthDirective from '../../../graphql/directives/auth';
import services from '../../../graphql/services';
import File from '../../../components/file/file.entity';
import { genFileName, genFilePath, validateFile } from '../../../components/file/utils';
import repositories from '../../../graphql/repositories';

export default class FileMiddleware {
  static async upload(request: Request, response: Response): Promise<void> {
    const {
      body: { configKey },
      file,
    } = request;
    const user = await AuthDirective.authenticate(services.userAccount, request);
    await validateFile(file as Express.Multer.File, configKey);

    const guid = await repositories.file.getGuid();
    const fileName = genFileName(guid, file?.originalname || '');
    const path = genFilePath(user?.userId, fileName);

    const partial: Partial<File> = {
      size: file?.size,
      userAccountId: user?.userId,
      generatedName: fileName,
      originalName: file?.originalname,
      mimetype: file?.mimetype,
      guid,
      path,
    };

    const fileCommon = await repositories.file.createOne(partial);
    services.file.upload(user, fileCommon, file as Express.Multer.File);
    response.status(200).send({ file: fileCommon });
  }

  static async getFile(request: Request, response: Response): Promise<void> {
    const {
      params: { id },
    } = request;

    const user = await AuthDirective.authenticate(services.userAccount, request);
    const fileCommon = await repositories.file.findOneByCondition({ id });

    if (!fileCommon) {
      response.status(500).send({ error: 'File was not found by id' });
      return;
    }

    response.status(200).send({ file: { ...fileCommon, url: fileCommon.url } });
  }
}
