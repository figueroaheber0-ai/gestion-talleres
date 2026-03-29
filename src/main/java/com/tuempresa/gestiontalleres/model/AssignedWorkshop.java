package com.tuempresa.gestiontalleres.model;

import java.io.Serializable;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "assignedworkshops")
@IdClass(AssignedWorkshopId.class)
public class AssignedWorkshop implements Serializable {
    @Id
    private Long userId;

    @Id
    private Long workshopId;
}
