/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RoomStatus = 'available' | 'occupied' | 'cleaning';
export type RoomType = 'standard' | 'vip';
export type GoodsCategory = 'drink' | 'food' | 'other';
export type UserRole = 'manager' | 'staff';

export interface HiredHostess {
  id: string;        // Unique ID for this specific session of service
  hostessId: string; // Reference to the actual Hostess ID
  name: string;
  pricePerHour: number;
  hiredAt: string;   // ISO string representing the start of this service
  leftAt?: string;   // ISO string representing the end of this service; if undefined, she is still serving
}

export interface OrderedGoods {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  orderedAt: string; // ISO string
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  status: RoomStatus;
  hourlyPrice: number;
  activeSession?: {
    startTime: string; // ISO string
    hostesses: HiredHostess[];
    items: OrderedGoods[];
  };
}

export interface Hostess {
  id: string;
  name: string;
  pricePerHour: number;
  status: 'available' | 'busy';
  currentRoomId: string | null;
}

export interface Goods {
  id: string;
  name: string;
  category: GoodsCategory;
  price: number;
  unit: string;
}

export interface Order {
  id: string;
  roomId: string;
  roomName: string;
  roomType: RoomType;
  hourlyPrice: number;
  startTime: string; // ISO
  endTime: string; // ISO
  durationMinutes: number;
  roomCharge: number;
  hostessCharge: number;
  goodsCharge: number;
  totalAmount: number;
  hostesses: HiredHostess[];
  items: OrderedGoods[];
  createdAt: string; // ISO
  createdBy: string; // User email or role
  isCancelled?: boolean;
  cancelReason?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO
  user: string; // User email or displayName
  role: UserRole;
  action: string;
  details: string;
}

export interface UserAccount {
  id: string;
  email: string; // Login name (can be email or phone)
  phone?: string;
  displayName: string;
  role: UserRole;
  password?: string;
  shopId?: string;
  karaokeId?: string;
}

export interface StoreRegistration {
  id: string;
  email: string;
  fullName: string;
  shopName: string;
  phone: string;
  password?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  shopId: string;
  karaokeId?: string;
}

export interface ShopSettings {
  shopName: string;
  address: string;
  phone: string;
  wifiName: string;
  wifiPassword: string;
  slogan?: string;
  logoUrl?: string;
}
