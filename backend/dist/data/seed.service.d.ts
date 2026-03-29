import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export declare class SeedService implements OnModuleInit {
    private readonly prisma;
    private readonly logger;
    private readonly workshops;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    private ensureAuxiliaryTables;
    private seedDatabase;
    private createRandom;
    private pick;
    private daysFromToday;
}
