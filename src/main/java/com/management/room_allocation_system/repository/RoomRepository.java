package com.management.room_allocation_system.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.management.room_allocation_system.entity.Room;
import com.management.room_allocation_system.entity.RoomStatus;
import com.management.room_allocation_system.entity.RoomType;

public interface RoomRepository extends JpaRepository<Room, Long>{
	
	List<Room> findByStatus(RoomStatus status);
    
    List<Room> findByRoomType(RoomType roomType);
    
//    //@Query("SELECT r FROM Room r WHERE r.currentOccupancy < r.capacity AND r.status = 'AVAILABLE'")
//    List<Room> findAvailableRooms();
//    
//    //@Query("SELECT r FROM Room r WHERE r.currentOccupancy >= r.capacity OR r.status = 'FULL'")
//    List<Room> findFullRooms();
//    
//    //@Query("SELECT r FROM Room r WHERE r.status = 'AVAILABLE' AND r.currentOccupancy < r.capacity AND r.roomType = :roomType")
//    List<Room> findAvailableRoomsByType(RoomType roomType);

}
