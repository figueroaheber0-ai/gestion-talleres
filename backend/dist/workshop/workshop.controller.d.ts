import { AuthService } from '../auth/auth.service';
import { WorkshopService } from './workshop.service';
export declare class WorkshopController {
    private readonly authService;
    private readonly workshopService;
    constructor(authService: AuthService, workshopService: WorkshopService);
    dashboard(authorization?: string): Promise<{
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
    clients(authorization?: string, search?: string): Promise<({
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
    intake(authorization?: string, body?: {
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
    vehicleHistory(authorization?: string, vehicleId?: string): Promise<{
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
        profile: Omit<import("./workshop.service").VehicleProfileRow, "vehicleId">;
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
    sessions(authorization?: string): Promise<{
        id: string;
        actorType: string;
        role: string;
        email: string;
        createdAt: Date;
        lastSeenAt: Date;
        active: boolean;
    }[]>;
    clientPortal(authorization?: string): Promise<{
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
                parts: {
                    quantity: number;
                    unitPrice: number;
                    internalCost: number;
                    providedByClient: boolean;
                    item: {
                        name: string;
                    };
                }[];
                updates: {
                    id: string;
                    title: string;
                    message: string;
                    visibility: string;
                    createdAt: Date;
                }[];
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
            profile: Omit<import("./workshop.service").VehicleProfileRow, "vehicleId">;
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
    addClientPortalVehicle(authorization?: string, body?: {
        plate: string;
        brand: string;
        model: string;
        year?: number;
    }): Promise<{
        ok: boolean;
        vehicleId: string;
    }>;
    updateClientPortalVehicleProfile(authorization?: string, vehicleId?: string, body?: {
        alias?: string | null;
        color?: string | null;
        notes?: string | null;
        insuranceProvider?: string | null;
        policyNumber?: string | null;
    }): Promise<{
        ok: boolean;
        vehicleId: string;
    }>;
    appointmentsBoard(authorization?: string): Promise<{
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
    moveBoardItem(authorization?: string, body?: {
        itemId: string;
        sourceColumn: 'agendados' | 'diagnostico' | 'reparacion' | 'listos';
        targetColumn: 'diagnostico' | 'reparacion' | 'listos';
    }): Promise<{
        ok: boolean;
        workOrderId: string;
    }>;
    workOrders(authorization?: string): Promise<{
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
    mechanics(authorization?: string): Promise<{
        id: string;
        name: string;
        email: string;
        role: string;
    }[]>;
    workOrderDetail(authorization?: string, workOrderId?: string): Promise<{
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
    inventoryItems(authorization?: string): Promise<{
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
    createInventoryItem(authorization?: string, body?: {
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
    addPartToWorkOrder(authorization?: string, workOrderId?: string, body?: {
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
    updateWorkOrder(authorization?: string, workOrderId?: string, body?: {
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
    financesSummary(authorization?: string, period?: 'dia' | 'semana' | 'mes' | 'anio'): Promise<{
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
}
