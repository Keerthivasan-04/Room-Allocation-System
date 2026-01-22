package com.management.room_allocation_system.entity;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import jakarta.persistence.*;


@JsonPropertyOrder({
    "id",
    "roomNumber",
    "capacity",
    "occupied",
    "status"
})

@Entity
@Table(name = "rooms")
public class Room {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Column(nullable = false, unique = true)
	private String roomNumber;
	
	@Column(nullable = false)
    private Integer capacity;
    
    @Column(nullable = false)
    private Integer currentOccupancy = 0;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomType roomType;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomStatus status = RoomStatus.AVAILABLE;
    
    @Column
    private Double rentPerBed;


	public Long getId() {
		return id;
	}


	public void setId(Long id) {
		this.id = id;
	}


	public String getRoomNumber() {
		return roomNumber;
	}


	public void setRoomNumber(String roomNumber) {
		this.roomNumber = roomNumber;
	}


	public Integer getCapacity() {
		return capacity;
	}


	public void setCapacity(Integer capacity) {
		this.capacity = capacity;
	}


	public Integer getCurrentOccupancy() {
		return currentOccupancy;
	}


	public void setCurrentOccupancy(Integer currentOccupancy) {
		this.currentOccupancy = currentOccupancy;
	}


	public RoomType getRoomType() {
		return roomType;
	}


	public void setRoomType(RoomType roomType) {
		this.roomType = roomType;
	}


	public RoomStatus getStatus() {
		return status;
	}


	public void setStatus(RoomStatus status) {
		this.status = status;
	}


	public Double getRentPerBed() {
		return rentPerBed;
	}


	public void setRentPerBed(Double rentPerBed) {
		this.rentPerBed = rentPerBed;
	}
	
	
}
