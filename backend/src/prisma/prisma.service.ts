import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected successfully.');
    } catch (error) {
      this.logger.warn(
        'Prisma could not connect on startup. The API will keep running for routes that do not need the database.',
      );
      if (error instanceof Error) {
        this.logger.warn(error.message);
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
