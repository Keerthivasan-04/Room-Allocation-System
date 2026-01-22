package com.management.room_allocation_system.service;

import java.util.List;

import com.management.room_allocation_system.entity.Room;
import com.management.room_allocation_system.entity.RoomStatus;
import com.management.room_allocation_system.entity.RoomType;

public interface RoomService {
	
	Room createRoom(Room room);
	
	Room updateRoom(Long id, Room room);
	
	void deleteRoom(Long id);
	
	Room getRoomById(Long id);
	
	List<Room> getAllRooms();
	
	List<Room> getAvailableRooms();
	
	List<Room> getFullRooms();
	
	List<Room> getRoomsByType(RoomType roomType);
	
	Room updateRoomStatus(Long id, RoomStatus status);
	
	void incrementOccupancy(Room room);
	
	void decrementOccupancy(Room room);
}
