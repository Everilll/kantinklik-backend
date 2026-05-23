import {
  PipeTransform,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

@Injectable()
export class ImageFilePipe implements PipeTransform {
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly maxSizeBytes = 2 * 1024 * 1024; // 2MB

  transform(file: Express.Multer.File) {
    if (!file) {
      throw new UnprocessableEntityException('File tidak boleh kosong');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new UnprocessableEntityException(
        `Tipe file tidak didukung. Gunakan: JPEG, PNG, atau WebP`,
      );
    }

    if (file.size > this.maxSizeBytes) {
      throw new UnprocessableEntityException(
        `Ukuran file maksimal 2MB. File kamu: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      );
    }

    return file;
  }
}
