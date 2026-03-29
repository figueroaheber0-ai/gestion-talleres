package com.tuempresa.gestiontalleres.model;

import java.io.Serializable;

import lombok.Data;

@Data
public class AssignedWorkshopId implements Serializable {
    private Long userId;
    private Long workshopId;
    
    // Constructor vacío es necesario para la serialización
    public AssignedWorkshopId() {}

    // Constructor con parámetros
    public AssignedWorkshopId(Long userId, Long workshopId) {
        this.userId = userId;
        this.workshopId = workshopId;
    }

    // Implementar equals y hashCode si es necesario
}
