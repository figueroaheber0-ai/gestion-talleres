import { PrismaService } from '../prisma/prisma.service';
import { SessionUser } from '../auth/auth.types';
export interface VehicleProfileRow {
    vehicleId: string;
    alias: string | null;
    color: string | null;
    notes: string | null;
    insuranceProvider: string | null;
    policyNumber: string | null;
}
export declare class WorkshopService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getDashboardSummary(user: SessionUser): Promise<{
        stats: {
            appointmentsToday: number;
            activeOrders: number;
            vehiclesInWorkshop: number;
        };
        recentAppointments: {
            id: string;
            vehicleLabel: string;
            plate: string;
            time: string;
            reason: string;
            status: string;
        }[];
    }>;
    listClients(user: SessionUser, search?: string): Promise<({
        vehicles: ({
            workOrders: {
                id: string;
                tenantId: string;
                createdAt: Date;
                updatedAt: Date;
                vehicleId: string;
                appointmentId: string | null;
                status: string;
                diagnostic: string | null;
                laborCost: number;
                totalCost: number;
                recommendedNextRevisionDate: Date | null;
                recommendedNextRevisionNote: string | null;
                mechanicId: string | null;
            }[];
        } & {
            id: string;
            tenantId: string;
            clientId: string;
            createdAt: Date;
            updatedAt: Date;
            plate: string;
            brand: string;
            model: string;
            year: number | null;
        })[];
    } & {
        id: string;
        name: string;
        email: string | null;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
    })[]>;
    createIntake(user: SessionUser, input: {
        clientName: string;
        phone?: string;
        email?: string;
        plate: string;
        brand: string;
        model: string;
        year?: number;
        reason: string;
        date: string;
        time: string;
    }): Promise<{
        appointmentId: string;
        vehicleId: string;
        clientId: string;
    }>;
    getVehicleHistory(user: SessionUser, vehicleId: string): Promise<{
        id: string;
        tenantId: string;
        workshopName: string;
        workshops: string[];
        plate: string;
        brand: string;
        model: string;
        year: number | null;
        client: {
            id: string;
            name: string;
            phone: string | null;
            email: string | null;
        };
        profile: Omit<VehicleProfileRow, "vehicleId">;
        workOrders: {
            tenantId: string;
            workshopName: string;
            updates: {
                id: string;
                workOrderId: string;
                title: string;
                message: string;
                visibility: string;
                createdAt: Date;
            }[];
            appointment: {
                id: string;
                tenantId: string;
                createdAt: Date;
                updatedAt: Date;
                vehicleId: string;
                status: string;
                date: Date;
                time: string;
                reason: string;
            } | null;
            mechanic: {
                id: string;
                name: string;
                email: string;
                role: string;
                tenantId: string;
                passwordHash: string;
                createdAt: Date;
                updatedAt: Date;
            } | null;
            parts: ({
                item: {
                    id: string;
                    name: string;
                    tenantId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    sku: string | null;
                    stockQuantity: number;
                    minAlert: number;
                    price: number;
                };
            } & {
                workOrderId: string;
                itemId: string;
                quantity: number;
                unitPrice: number;
                internalCost: number;
                providedByClient: boolean;
            })[];
            id: string;
            createdAt: Date;
            updatedAt: Date;
            vehicleId: string;
            appointmentId: string | null;
            status: string;
            diagnostic: string | null;
            laborCost: number;
            totalCost: number;
            recommendedNextRevisionDate: Date | null;
            recommendedNextRevisionNote: string | null;
            mechanicId: string | null;
        }[];
    }>;
    getClientPortal(user: SessionUser): Promise<{
        vehicles: {
            workshopName: string;
            workOrders: {
                id: string;
                status: string;
                diagnostic: string | null;
                laborCost: number;
                totalCost: number;
                createdAt: Date;
                recommendedNextRevisionDate: Date | null;
                recommendedNextRevisionNote: string | null;
                mechanic: {
                    name: string;
                } | null;
                appointment: {
                    id: string;
                    date: Date;
                    time: string;
                    reason: string;
                    status: string;
                } | null;
                parts: Array<{
                    quantity: number;
                    unitPrice: number;
                    internalCost: number;
                    providedByClient: boolean;
                    item: {
                        name: string;
                    };
                }>;
                updates: Array<{
                    id: string;
                    title: string;
                    message: string;
                    visibility: string;
                    createdAt: Date;
                }>;
                tenantId: string;
                workshopName: string;
            }[];
            id: string;
            tenantId: string;
            workshops: string[];
            plate: string;
            brand: string;
            model: string;
            year: number | null;
            profile: Omit<VehicleProfileRow, "vehicleId">;
            client: {
                id: string;
                name: string;
                phone: string | null;
                email: string | null;
            };
        }[];
        id: string;
        name: string;
        email: string | null;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
    }>;
    addVehicleToClientPortal(user: SessionUser, input: {
        plate: string;
        brand: string;
        model: string;
        year?: number;
    }): Promise<{
        ok: boolean;
        vehicleId: string;
    }>;
    updateClientPortalVehicleProfile(user: SessionUser, vehicleId: string, input: {
        alias?: string | null;
        color?: string | null;
        notes?: string | null;
        insuranceProvider?: string | null;
        policyNumber?: string | null;
    }): Promise<{
        ok: boolean;
        vehicleId: string;
    }>;
    getAppointmentsBoard(user: SessionUser): Promise<{
        count: number;
        id: string;
        title: string;
        color: string;
        dot: string;
        items: {
            id: string;
            itemType: string;
            vehicleId: string;
            plate: string;
            model: string;
            client: string;
            reason: string;
            assigned: string;
            urgent: boolean;
            scheduledFor: Date;
            time: string | null;
        }[];
    }[]>;
    moveBoardItem(user: SessionUser, input: {
        itemId: string;
        sourceColumn: 'agendados' | 'diagnostico' | 'reparacion' | 'listos';
        targetColumn: 'diagnostico' | 'reparacion' | 'listos';
    }): Promise<{
        ok: boolean;
        workOrderId: string;
    }>;
    listMechanics(user: SessionUser): Promise<{
        id: string;
        name: string;
        email: string;
        role: string;
    }[]>;
    getWorkOrderDetail(user: SessionUser, workOrderId: string): Promise<{
        id: string;
        status: string;
        diagnostic: string | null;
        laborCost: number;
        totalCost: number;
        recommendedNextRevisionDate: Date | null;
        recommendedNextRevisionNote: string | null;
        mechanicId: string | null;
        mechanicName: string | null;
        parts: {
            itemId: string;
            name: string;
            sku: string | null;
            quantity: number;
            unitPrice: number;
            internalCost: number;
            providedByClient: boolean;
        }[];
        vehicle: {
            id: string;
            plate: string;
            brand: string;
            model: string;
            year: number | null;
        };
        client: {
            id: string;
            name: string;
            phone: string | null;
            email: string | null;
        };
        appointment: {
            id: string;
            date: Date;
            time: string;
            reason: string;
            status: string;
        } | null;
        updates: {
            id: string;
            title: string;
            message: string;
            visibility: string;
            createdAt: Date;
        }[];
    }>;
    listInventoryItems(user: SessionUser): Promise<{
        id: string;
        name: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        sku: string | null;
        stockQuantity: number;
        minAlert: number;
        price: number;
    }[]>;
    createInventoryItem(user: SessionUser, input: {
        name: string;
        sku?: string;
        stockQuantity?: number;
        minAlert?: number;
        price?: number;
    }): Promise<{
        id: string;
        name: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        sku: string | null;
        stockQuantity: number;
        minAlert: number;
        price: number;
    }>;
    addPartToWorkOrder(user: SessionUser, workOrderId: string, input: {
        itemId: string;
        quantity: number;
        unitPrice: number;
        internalCost: number;
        providedByClient?: boolean;
    }): Promise<{
        id: string;
        status: string;
        diagnostic: string | null;
        laborCost: number;
        totalCost: number;
        recommendedNextRevisionDate: Date | null;
        recommendedNextRevisionNote: string | null;
        mechanicId: string | null;
        mechanicName: string | null;
        parts: {
            itemId: string;
            name: string;
            sku: string | null;
            quantity: number;
            unitPrice: number;
            internalCost: number;
            providedByClient: boolean;
        }[];
        vehicle: {
            id: string;
            plate: string;
            brand: string;
            model: string;
            year: number | null;
        };
        client: {
            id: string;
            name: string;
            phone: string | null;
            email: string | null;
        };
        appointment: {
            id: string;
            date: Date;
            time: string;
            reason: string;
            status: string;
        } | null;
        updates: {
            id: string;
            title: string;
            message: string;
            visibility: string;
            createdAt: Date;
        }[];
    }>;
    updateWorkOrder(user: SessionUser, workOrderId: string, input: {
        diagnostic?: string;
        laborCost?: number;
        totalCost?: number;
        recommendedNextRevisionDate?: string | null;
        recommendedNextRevisionNote?: string | null;
        mechanicId?: string | null;
        clientUpdateTitle?: string;
        clientUpdateMessage?: string;
    }): Promise<{
        id: string;
        status: string;
        diagnostic: string | null;
        laborCost: number;
        totalCost: number;
        recommendedNextRevisionDate: Date | null;
        recommendedNextRevisionNote: string | null;
        mechanicId: string | null;
        mechanicName: string | null;
        parts: {
            itemId: string;
            name: string;
            sku: string | null;
            quantity: number;
            unitPrice: number;
            internalCost: number;
            providedByClient: boolean;
        }[];
        vehicle: {
            id: string;
            plate: string;
            brand: string;
            model: string;
            year: number | null;
        };
        client: {
            id: string;
            name: string;
            phone: string | null;
            email: string | null;
        };
        appointment: {
            id: string;
            date: Date;
            time: string;
            reason: string;
            status: string;
        } | null;
        updates: {
            id: string;
            title: string;
            message: string;
            visibility: string;
            createdAt: Date;
        }[];
    }>;
    listWorkOrders(user: SessionUser): Promise<{
        id: string;
        vehicleId: string;
        vehiculo: string;
        patente: string;
        cliente: string;
        mecanico: string;
        motivo: string;
        estado: string;
        prioridad: string;
        fechaIngreso: Date;
        estimado: number;
        internalCost: number;
        margin: number;
    }[]>;
    getFinanceSummary(user: SessionUser, period?: 'dia' | 'semana' | 'mes' | 'anio' | undefined): Promise<{
        period: "dia" | "semana" | "mes" | "anio";
        summary: {
            ingresos: number;
            costos: number;
            ganancia: number;
        };
        byMechanic: {
            name: string;
            value: number;
            color: string;
        }[];
        timeline: {
            name: string;
            ingresos: number;
            costos: number;
            ganancia: number;
        }[];
    }>;
    private joinSqlValues;
    private normalizeOptionalText;
    private buildClientVehicleWhere;
    private ensureVehicleProfileTable;
    private getVehicleProfile;
    private getVehicleProfiles;
    private emptyVehicleProfile;
    private resolveRelatedPortalClients;
    private groupPortalVehicles;
    private mapColumnToWorkOrderStatus;
    private getPeriodStart;
    private formatTimelineLabel;
}
