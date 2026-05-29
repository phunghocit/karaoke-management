/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Room, Hostess, Goods, UserAccount } from '../types';

export const initialRooms: Room[] = [
  { id: 'R101', name: 'Phòng 101', type: 'standard', status: 'available', hourlyPrice: 150000 },
  { id: 'R102', name: 'Phòng 102', type: 'standard', status: 'available', hourlyPrice: 150000 },
  { id: 'R103', name: 'Phòng 103', type: 'standard', status: 'available', hourlyPrice: 150000 },
  { id: 'R201', name: 'Phòng VIP 201', type: 'vip', status: 'available', hourlyPrice: 250000 },
  { id: 'R202', name: 'Phòng VIP 202', type: 'vip', status: 'available', hourlyPrice: 250000 },
  { id: 'R203', name: 'Phòng VIP 203', type: 'vip', status: 'available', hourlyPrice: 250000 },
  { id: 'R301', name: 'Phòng Super VIP 301', type: 'vip', status: 'available', hourlyPrice: 350000 },
  { id: 'R302', name: 'Phòng 302', type: 'standard', status: 'available', hourlyPrice: 150000 },
];

export const initialHostesses: Hostess[] = [
  { id: 'H01', name: 'Nguyễn Thùy Chi', pricePerHour: 120000, status: 'available', currentRoomId: null },
  { id: 'H02', name: 'Trần Minh Hằng', pricePerHour: 150000, status: 'available', currentRoomId: null },
  { id: 'H03', name: 'Mai Phương Thảo', pricePerHour: 120000, status: 'available', currentRoomId: null },
  { id: 'H04', name: 'Lê Khánh Linh', pricePerHour: 150000, status: 'available', currentRoomId: null },
  { id: 'H05', name: 'Phạm Bảo Trân', pricePerHour: 200000, status: 'available', currentRoomId: null },
  { id: 'H06', name: 'Hoàng Kim Ngân', pricePerHour: 180000, status: 'available', currentRoomId: null },
];

export const initialGoods: Goods[] = [
  { id: 'G01', name: 'Bia Heineken (Lon)', category: 'drink', price: 35000, unit: 'Lon' },
  { id: 'G02', name: 'Bia Tiger Crystal (Lon)', category: 'drink', price: 29000, unit: 'Lon' },
  { id: 'G03', name: 'Nước suối Aquafina', category: 'drink', price: 15000, unit: 'Chai' },
  { id: 'G04', name: 'Coca Cola', category: 'drink', price: 20000, unit: 'Lon' },
  { id: 'G05', name: 'Đĩa trái cây thập cẩm (Lớn)', category: 'food', price: 250000, unit: 'Đĩa' },
  { id: 'G06', name: 'Đĩa trái cây thập cẩm (Nhỏ)', category: 'food', price: 150000, unit: 'Đĩa' },
  { id: 'G07', name: 'Khô mực nướng', category: 'food', price: 180000, unit: 'Con' },
  { id: 'G08', name: 'Bim Bim dừa', category: 'food', price: 20000, unit: 'Gói' },
  { id: 'G09', name: 'Hạt hướng dương', category: 'food', price: 25000, unit: 'Đĩa' },
  { id: 'G10', name: 'Khăn ướt', category: 'other', price: 5000, unit: 'Cái' },
  { id: 'G11', name: 'Đầu phông/Nến sinh nhật', category: 'other', price: 50000, unit: 'Bộ' },
];

export const defaultUsers: UserAccount[] = [
  { id: 'U01', email: 'quanly@karaoke.com', displayName: 'Phùng Hải - Quản lý', role: 'manager', password: '123456', shopId: 'default_shop' },
  { id: 'U02', email: 'nhanvien@karaoke.com', displayName: 'Nguyễn Văn Nam - Thu Ngân', role: 'staff', password: '123456', shopId: 'default_shop' },
];
