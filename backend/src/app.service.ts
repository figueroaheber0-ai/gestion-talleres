import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      ok: true,
      service: '81cc-backend',
      auth: 'enabled',
    };
  }
}
