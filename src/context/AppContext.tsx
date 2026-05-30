/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Room, RoomType, Hostess, Goods, Order, ActivityLog, UserAccount, UserRole, HiredHostess, OrderedGoods, RoomStatus, ShopSettings, StoreRegistration } from '../types';
import { initialRooms, initialHostesses, initialGoods, defaultUsers } from '../data/initialData';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, onSnapshot, deleteDoc, getDocs, collectionGroup } from 'firebase/firestore';

interface AppContextProps {
  rooms: Room[];
  hostesses: Hostess[];
  goods: Goods[];
  orders: Order[];
  logs: ActivityLog[];
  users: UserAccount[];
  currentUser: UserAccount | null;
  setCurrentUser: (user: UserAccount | null) => void;
  isLoading: boolean;
  settings: ShopSettings;
  updateShopSettings: (settings: ShopSettings) => void;
  
  // Registration & Approval Flow
  registrations: StoreRegistration[];
  submitRegistration: (fullName: string, email: string, shopName: string, phone: string, password?: string) => void;
  approveRegistration: (registrationId: string) => void;
  rejectRegistration: (registrationId: string) => void;
  deleteRegistration: (registrationId: string) => void;
  clearAllRegistrations: () => void;
  logout: () => void;
  
  // Room Actions
  startRoom: (roomId: string) => void;
  addGoodsToRoom: (roomId: string, goodsId: string, quantity: number) => void;
  addHostessToRoom: (roomId: string, hostessId: string, customHiredAt?: string) => void;
  removeHostessFromRoom: (roomId: string, hostessSessionId: string, customLeftAt?: string) => void;
  resumeHostessSession: (roomId: string, sessionId: string) => void;
  deleteHostessSession: (roomId: string, sessionId: string) => void;
  updateHostessSessionTimes: (roomId: string, sessionId: string, hiredAt: string, leftAt?: string) => void;
  updateRoomSessionTimes: (roomId: string, startTime: string) => void;
  checkoutRoom: (roomId: string, customEndTime?: string) => Order | null;
  cancelRoom: (roomId: string, reason: string) => void;
  reopenOrder: (orderId: string) => boolean;
  deleteOrder: (orderId: string) => boolean;
  completeCleaning: (roomId: string) => void;
  updateRoomPrice: (roomId: string, price: number) => void;
  addRoom: (name: string, type: RoomType, hourlyPrice: number) => void;
  updateRoom: (roomId: string, name: string, type: RoomType, hourlyPrice: number) => void;
  deleteRoom: (roomId: string) => void;
  
  // Hostess CRUD
  addHostess: (hostess: Omit<Hostess, 'status' | 'currentRoomId'>) => void;
  updateHostess: (hostess: Hostess) => void;
  deleteHostess: (hostessId: string) => void;
  
  // Goods CRUD
  addGoods: (item: Omit<Goods, 'id'>) => void;
  updateGoods: (item: Goods) => void;
  deleteGoods: (itemId: string) => void;

  // Account CRUD
  updateUserRole: (userId: string, role: UserRole) => void;
  addUserAccount: (displayName: string, email: string, role: UserRole, password?: string) => Promise<void>;
  deleteUserAccount: (userId: string) => Promise<void>;

  // Global Actions
  clearAllData: () => void;

  // Theme Settings
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// Helper function to remove undefined properties recursively before saving to Firestore
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const fresh: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        fresh[key] = cleanUndefined(val);
      }
    }
    return fresh as T;
  }
  return obj;
}

// Real-time synchronization channels
const CHANNEL_NAME = 'karaoke_sync_realtime';

const defaultSettings: ShopSettings = {
  shopName: 'KARAOKE LUXURY',
  address: 'Đường 3/2, Quận 10, Thành phố Hồ Chí Minh',
  phone: '0987.654.321',
  wifiName: 'LuxuryKaraoke',
  wifiPassword: '88888888',
  slogan: 'ĐỒNG BỘ THỜI GIAN THỰC'
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hostesses, setHostesses] = useState<Hostess[]>([]);
  const [goods, setGoods] = useState<Goods[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<UserAccount[]>(defaultUsers);
  const [currentUser, setCurrentUserVal] = useState<UserAccount | null>(null);
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings);
  const [registrations, setRegistrations] = useState<StoreRegistration[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSessionSynced, setIsSessionSynced] = useState<boolean>(true);

  // Synchronous references to the most up-to-date states to avoid stale-closure race conditions in async saves
  const lastSyncedRoomsRef = useRef<Room[]>([]);
  const lastSyncedHostessesRef = useRef<Hostess[]>([]);
  const lastSyncedGoodsRef = useRef<Goods[]>([]);
  const lastSyncedOrdersRef = useRef<Order[]>([]);
  const lastSyncedLogsRef = useRef<ActivityLog[]>([]);
  const lastSyncedUsersRef = useRef<UserAccount[]>([]);
  const lastSyncedSettingsRef = useRef<ShopSettings | null>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('karaoke_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('karaoke_theme', next);
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  // Helper logger
  const addLogEntry = (action: string, details: string, currentLogs = logs): ActivityLog[] => {
    const newLog: ActivityLog = {
      id: `L_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser ? currentUser.displayName : 'Hệ thống',
      role: currentUser ? currentUser.role : 'manager',
      action,
      details
    };
    return [newLog, ...currentLogs];
  };

  const createInitialLogsForShop = (displayName: string, shopId: string): ActivityLog[] => {
    return [
      {
        id: `L0_${shopId}`,
        timestamp: new Date().toISOString(),
        user: 'Hệ thống',
        role: 'manager',
        action: 'Khởi tạo hệ thống',
        details: `Tạo thành công không gian quản lý quán hát riêng biệt cho: ${displayName}.`
      }
    ];
  };

  const loadShopData = (user: UserAccount, regsList: StoreRegistration[] = []) => {
    const shopId = user.shopId || 'default_shop';

    const storedRooms = localStorage.getItem(`kar_rooms_${shopId}`);
    const storedHostesses = localStorage.getItem(`kar_hostesses_${shopId}`);
    const storedGoods = localStorage.getItem(`kar_goods_${shopId}`);
    const storedOrders = localStorage.getItem(`kar_orders_${shopId}`);
    const storedLogs = localStorage.getItem(`kar_logs_${shopId}`);
    const storedSettings = localStorage.getItem(`kar_settings_${shopId}`);

    if (storedRooms) setRooms(JSON.parse(storedRooms));
    else setRooms(shopId === 'default_shop' ? initialRooms : []);

    if (storedHostesses) setHostesses(JSON.parse(storedHostesses));
    else setHostesses(shopId === 'default_shop' ? initialHostesses : []);

    if (storedGoods) setGoods(JSON.parse(storedGoods));
    else setGoods(shopId === 'default_shop' ? initialGoods : []);

    if (storedOrders) setOrders(JSON.parse(storedOrders));
    else setOrders([]);

    if (storedLogs) setLogs(JSON.parse(storedLogs));
    else setLogs(createInitialLogsForShop(user.displayName, shopId));

    if (storedSettings) setSettings(JSON.parse(storedSettings));
    else {
      const match = regsList.find(r => r.shopId === shopId);
      const customName = match ? match.shopName.toUpperCase() : (shopId === 'default_shop' ? 'KARAOKE LUXURY' : 'KARAOKE SHOP');
      const customPhone = match ? match.phone : '0987.654.321';
      const initialStoreSettings = {
        shopName: customName,
        address: 'Địa chỉ chưa cập nhật',
        phone: customPhone,
        wifiName: 'KaraokeFree',
        wifiPassword: '88888888',
        slogan: 'ĐỒNG BỘ THỜI GIAN THỰC'
      };
      setSettings(initialStoreSettings);
      localStorage.setItem(`kar_settings_${shopId}`, JSON.stringify(initialStoreSettings));
    }
  };

  // Helper to migrate and hydrate any local storage data to Firestore so it is persistent under the requested nested collections layout
  const syncLocalToFirestore = async (shopId: string) => {
    try {
      // 1. Check if we already migrated to the new nested subcollections layout
      const roomsSnap = await getDocs(collection(db, 'karaokes', shopId, 'rooms'));
      const isMigrated = !roomsSnap.empty;

      if (!isMigrated) {
        console.log(`Migrating data for ${shopId} to the new nested subcollections layout`);
        
        // Try to load any old single document data to avoid data loss
        const shopSnap = await getDoc(doc(db, 'shops', shopId));
        let roomsToMigrate: Room[] = [];
        let hostessesToMigrate: Hostess[] = [];
        let goodsToMigrate: Goods[] = [];
        let settingsToMigrate: ShopSettings = defaultSettings;
        let ordersToMigrate: Order[] = [];
        let logsToMigrate: ActivityLog[] = [];

        if (shopSnap.exists()) {
          const shopData = shopSnap.data();
          roomsToMigrate = shopData.rooms || [];
          hostessesToMigrate = shopData.hostesses || [];
          goodsToMigrate = shopData.goods || [];
          settingsToMigrate = shopData.settings || defaultSettings;
          ordersToMigrate = shopData.orders || [];
          logsToMigrate = shopData.logs || [];
        } else {
          // Fallback to local storage or initial datasets
          const storedRooms = localStorage.getItem(`kar_rooms_${shopId}`);
          roomsToMigrate = storedRooms ? JSON.parse(storedRooms) : (shopId === 'default_shop' ? initialRooms : []);

          const storedHostesses = localStorage.getItem(`kar_hostesses_${shopId}`);
          hostessesToMigrate = storedHostesses ? JSON.parse(storedHostesses) : (shopId === 'default_shop' ? initialHostesses : []);

          const storedGoods = localStorage.getItem(`kar_goods_${shopId}`);
          goodsToMigrate = storedGoods ? JSON.parse(storedGoods) : (shopId === 'default_shop' ? initialGoods : []);

          const storedSettings = localStorage.getItem(`kar_settings_${shopId}`);
          settingsToMigrate = storedSettings ? JSON.parse(storedSettings) : defaultSettings;

          const storedOrders = localStorage.getItem(`kar_orders_${shopId}`);
          ordersToMigrate = storedOrders ? JSON.parse(storedOrders) : [];

          const storedLogs = localStorage.getItem(`kar_logs_${shopId}`);
          logsToMigrate = storedLogs ? JSON.parse(storedLogs) : createInitialLogsForShop(currentUser?.displayName || 'Chủ quán', shopId);
        }

        // Migrate rooms under karaokes/{karaokeId}/rooms/{roomId}
        for (const room of roomsToMigrate) {
          await setDoc(doc(db, 'karaokes', shopId, 'rooms', room.id), cleanUndefined(room));
        }
        // Migrate hostesses under karaokes/{karaokeId}/hostesses/{hostessId}
        for (const hostess of hostessesToMigrate) {
          await setDoc(doc(db, 'karaokes', shopId, 'hostesses', hostess.id), cleanUndefined(hostess));
        }
        // Migrate goods/products under karaokes/{karaokeId}/products/{productId}
        for (const item of goodsToMigrate) {
          await setDoc(doc(db, 'karaokes', shopId, 'products', item.id), cleanUndefined(item));
        }
        // Migrate invoices under karaokes/{karaokeId}/invoices/{invoiceId}
        for (const order of ordersToMigrate) {
          await setDoc(doc(db, 'karaokes', shopId, 'invoices', order.id), cleanUndefined(order));
        }
        // Migrate logs under karaokes/{karaokeId}/logs/{logId}
        for (const log of logsToMigrate) {
          await setDoc(doc(db, 'karaokes', shopId, 'logs', log.id), cleanUndefined(log));
        }
        // Migrate settings in root karaoke document
        await setDoc(doc(db, 'karaokes', shopId), cleanUndefined({
          karaokeId: shopId,
          settings: settingsToMigrate
        }));

        // Migrate shop user accounts inside karaokes/{karaokeId}/accounts/{accountId}
        const storedUsers = localStorage.getItem('kar_users');
        const usersToStore: UserAccount[] = storedUsers ? JSON.parse(storedUsers) : defaultUsers;
        for (const u of usersToStore) {
          const uShopId = u.shopId || 'default_shop';
          await setDoc(doc(db, 'karaokes', uShopId, 'accounts', u.id), cleanUndefined({
            ...u,
            karaokeId: uShopId
          }));
        }
      }
    } catch (err) {
      console.error("Migration to v2 subcollections layout error:", err);
    }
  };

  // Sync state reference to handle incoming broadcasts cleanly
  useEffect(() => {
    // 1. Initial Load from LocalStorage
    const storedUsers = localStorage.getItem('kar_users');
    const parsedUsers: UserAccount[] = storedUsers ? JSON.parse(storedUsers) : defaultUsers;
    setUsers(parsedUsers);
    if (!storedUsers) {
      localStorage.setItem('kar_users', JSON.stringify(defaultUsers));
    }

    const storedRegs = localStorage.getItem('kar_store_registrations');
    const parsedRegs: StoreRegistration[] = storedRegs ? JSON.parse(storedRegs) : [];
    setRegistrations(parsedRegs);

    const storedUser = localStorage.getItem('kar_current_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser) as UserAccount;
      setCurrentUserVal(parsedUser);
      loadShopData(parsedUser, parsedRegs);
    } else {
      setCurrentUserVal(null);
    }

    setIsLoading(false);
  }, []);

  // 1. Subscribe to registrations & users immediately on mount (runs independently of Auth state to ensure 100% data access)
  useEffect(() => {
    const unsubRegs = onSnapshot(collection(db, 'pendingRegistrations'), (snapshot) => {
      const list: StoreRegistration[] = [];
      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        const kId = item.karaokeId || item.shopId || '';
        list.push({
          ...item,
          shopId: kId,
          karaokeId: kId
        } as StoreRegistration);
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setRegistrations(list);
      localStorage.setItem('kar_store_registrations', JSON.stringify(list));
    }, (err) => {
      console.warn("Firestore reading pendingRegistrations warning:", err);
    });

    const unsubUsers = onSnapshot(collectionGroup(db, 'accounts'), (snapshot) => {
      const list: UserAccount[] = [];
      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        const kId = item.karaokeId || item.shopId || '';
        list.push({
          ...item,
          shopId: kId,
          karaokeId: kId
        } as UserAccount);
      });
      
      // Merge in defaultUsers to make sure they are always present and never wiped out
      const mergedList = [...list];
      defaultUsers.forEach(defU => {
        if (!mergedList.some(u => (u.email && u.email.toLowerCase() === defU.email.toLowerCase()) || (u.phone && u.phone === defU.phone))) {
          mergedList.push(defU);
        }
      });
      
      setUsers(mergedList);
      lastSyncedUsersRef.current = mergedList;
      localStorage.setItem('kar_users', JSON.stringify(mergedList));
    }, (err) => {
      console.warn("Firestore reading accounts collectionGroup warning:", err);
    });

    return () => {
      unsubRegs();
      unsubUsers();
    };
  }, []);

  // 2. Firebase Auth anonymous login & current user profile session sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        try {
          await signInAnonymously(auth);
        } catch (err: any) {
          // Silently fail if anonymous auth is disabled or not allowed
          if (err?.code === 'auth/admin-restricted-operation' || err?.code === 'auth/operation-not-allowed') {
            console.warn("Anonymous authentication is not enabled. User will remain unauthenticated.");
          } else {
            console.error("Failed to sign in anonymously", err);
          }
        }
        return;
      }

      // Write active user details to Firestore karaokes/{shopId}/sessions/{uid} so session telemetry is tracked cleanly
      if (currentUser) {
        const shopId = currentUser.shopId || 'default_shop';
        try {
          await setDoc(doc(db, 'karaokes', shopId, 'sessions', fbUser.uid), {
            id: currentUser.id,
            email: currentUser.email,
            displayName: currentUser.displayName,
            role: currentUser.role,
            phone: currentUser.phone || '',
            shopId: shopId,
            karaokeId: shopId
          });
          setIsSessionSynced(true);
        } catch (err) {
          console.error("Failed to set user session in Firestore karaokes subcollection:", err);
          setIsSessionSynced(true); // Set to true anyway since database security rules are fully open
        }
      } else {
        setIsSessionSynced(true); // Open session access so that listeners are ready
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, [currentUser]);

  // Real-time synchronization of the single unified Firestore document matching the current shopId
  useEffect(() => {
    if (!currentUser || !isSessionSynced) return;
    const shopId = currentUser.shopId || 'default_shop';

    let unsubscribes: (() => void)[] = [];

    const setupSyncAndListeners = async () => {
      setIsLoading(true);
      
      // Ensure we migrated any local storage data to Firestore
      await syncLocalToFirestore(shopId);

      // Setup individual subcollection snapshots as per nested schema
      const unsubRooms = onSnapshot(collection(db, 'karaokes', shopId, 'rooms'), (snapshot) => {
        const list: Room[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Room);
        });
        list.sort((a, b) => a.id.localeCompare(b.id));
        setRooms(list);
        lastSyncedRoomsRef.current = list;
        localStorage.setItem(`kar_rooms_${shopId}`, JSON.stringify(list));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `karaokes/${shopId}/rooms`);
      });
      unsubscribes.push(unsubRooms);

      const unsubHostesses = onSnapshot(collection(db, 'karaokes', shopId, 'hostesses'), (snapshot) => {
        const list: Hostess[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Hostess);
        });
        list.sort((a, b) => a.id.localeCompare(b.id));
        setHostesses(list);
        lastSyncedHostessesRef.current = list;
        localStorage.setItem(`kar_hostesses_${shopId}`, JSON.stringify(list));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `karaokes/${shopId}/hostesses`);
      });
      unsubscribes.push(unsubHostesses);

      const unsubGoods = onSnapshot(collection(db, 'karaokes', shopId, 'products'), (snapshot) => {
        const list: Goods[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Goods);
        });
        list.sort((a, b) => a.id.localeCompare(b.id));
        setGoods(list);
        lastSyncedGoodsRef.current = list;
        localStorage.setItem(`kar_goods_${shopId}`, JSON.stringify(list));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `karaokes/${shopId}/products`);
      });
      unsubscribes.push(unsubGoods);

      const unsubOrders = onSnapshot(collection(db, 'karaokes', shopId, 'invoices'), (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Order);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(list);
        lastSyncedOrdersRef.current = list;
        localStorage.setItem(`kar_orders_${shopId}`, JSON.stringify(list));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `karaokes/${shopId}/invoices`);
      });
      unsubscribes.push(unsubOrders);

      const unsubLogs = onSnapshot(collection(db, 'karaokes', shopId, 'logs'), (snapshot) => {
        const list: ActivityLog[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as ActivityLog);
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(list);
        lastSyncedLogsRef.current = list;
        localStorage.setItem(`kar_logs_${shopId}`, JSON.stringify(list));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `karaokes/${shopId}/logs`);
      });
      unsubscribes.push(unsubLogs);

      const unsubSettings = onSnapshot(doc(db, 'karaokes', shopId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.settings) {
            setSettings(data.settings);
            lastSyncedSettingsRef.current = data.settings;
            localStorage.setItem(`kar_settings_${shopId}`, JSON.stringify(data.settings));
          }
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `karaokes/${shopId}`);
      });
      unsubscribes.push(unsubSettings);

      setIsLoading(false);
    };

    setupSyncAndListeners();

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [currentUser, isSessionSynced]);

  // Hook to broadcast updates and sync dynamically with Firestore
  const syncAndSave = (
    newRooms: Room[],
    newHostesses: Hostess[],
    newGoods: Goods[],
    newOrders: Order[],
    newLogs: ActivityLog[],
    newUsers = users,
    newSettings = settings
  ) => {
    const shopId = currentUser?.shopId || 'default_shop';

    // Save global users array
    localStorage.setItem('kar_users', JSON.stringify(newUsers));
    
    // Save shop-specific states
    localStorage.setItem(`kar_rooms_${shopId}`, JSON.stringify(newRooms));
    localStorage.setItem(`kar_hostesses_${shopId}`, JSON.stringify(newHostesses));
    localStorage.setItem(`kar_goods_${shopId}`, JSON.stringify(newGoods));
    localStorage.setItem(`kar_orders_${shopId}`, JSON.stringify(newOrders));
    localStorage.setItem(`kar_logs_${shopId}`, JSON.stringify(newLogs));
    localStorage.setItem(`kar_settings_${shopId}`, JSON.stringify(newSettings));

    setRooms(newRooms);
    setHostesses(newHostesses);
    setGoods(newGoods);
    setOrders(newOrders);
    setLogs(newLogs);
    setUsers(newUsers);
    setSettings(newSettings);

    const oldRooms = lastSyncedRoomsRef.current;
    const oldHostesses = lastSyncedHostessesRef.current;
    const oldGoods = lastSyncedGoodsRef.current;
    const oldOrders = lastSyncedOrdersRef.current;
    const oldLogs = lastSyncedLogsRef.current;
    const oldUsers = lastSyncedUsersRef.current;
    const oldSettings = lastSyncedSettingsRef.current;

    // Fast-updates to ref so we don't duplicate background writes
    lastSyncedRoomsRef.current = newRooms;
    lastSyncedHostessesRef.current = newHostesses;
    lastSyncedGoodsRef.current = newGoods;
    lastSyncedOrdersRef.current = newOrders;
    lastSyncedLogsRef.current = newLogs;
    lastSyncedUsersRef.current = newUsers;
    lastSyncedSettingsRef.current = newSettings;

    // Save synchronously to Firestore in the background under the new subcollections nested design
    const saveToFirestoreInCg = async () => {
      try {
        // Surgically write Rooms that have been added or updated
        const changedRooms = newRooms.filter(nr => {
          const old = oldRooms.find(or => or.id === nr.id);
          return !old || JSON.stringify(nr) !== JSON.stringify(old);
        });
        for (const r of changedRooms) {
          await setDoc(doc(db, 'karaokes', shopId, 'rooms', r.id), cleanUndefined(r));
        }
        const deletedRooms = oldRooms.filter(or => !newRooms.some(nr => nr.id === or.id));
        for (const r of deletedRooms) {
          await deleteDoc(doc(db, 'karaokes', shopId, 'rooms', r.id));
        }

        // Surgically write Hostesses
        const changedHostesses = newHostesses.filter(nh => {
          const old = oldHostesses.find(oh => oh.id === nh.id);
          return !old || JSON.stringify(nh) !== JSON.stringify(old);
        });
        for (const h of changedHostesses) {
          await setDoc(doc(db, 'karaokes', shopId, 'hostesses', h.id), cleanUndefined(h));
        }
        const deletedHostesses = oldHostesses.filter(oh => !newHostesses.some(nh => nh.id === oh.id));
        for (const h of deletedHostesses) {
          await deleteDoc(doc(db, 'karaokes', shopId, 'hostesses', h.id));
        }

        // Surgically write Products
        const changedGoods = newGoods.filter(ng => {
          const old = oldGoods.find(og => og.id === ng.id);
          return !old || JSON.stringify(ng) !== JSON.stringify(old);
        });
        for (const g of changedGoods) {
          await setDoc(doc(db, 'karaokes', shopId, 'products', g.id), cleanUndefined(g));
        }
        const deletedGoods = oldGoods.filter(og => !newGoods.some(ng => ng.id === og.id));
        for (const g of deletedGoods) {
          await deleteDoc(doc(db, 'karaokes', shopId, 'products', g.id));
        }

        // Surgically write Invoices
        const changedOrders = newOrders.filter(no => {
          const old = oldOrders.find(oo => oo.id === no.id);
          return !old || JSON.stringify(no) !== JSON.stringify(old);
        });
        for (const o of changedOrders) {
          await setDoc(doc(db, 'karaokes', shopId, 'invoices', o.id), cleanUndefined(o));
        }
        const deletedOrders = oldOrders.filter(oo => !newOrders.some(no => no.id === oo.id));
        for (const o of deletedOrders) {
          await deleteDoc(doc(db, 'karaokes', shopId, 'invoices', o.id));
        }

        // Surgically write Logs
        const changedLogs = newLogs.filter(nl => {
          const old = oldLogs.find(ol => ol.id === nl.id);
          return !old || JSON.stringify(nl) !== JSON.stringify(old);
        });
        for (const l of changedLogs) {
          await setDoc(doc(db, 'karaokes', shopId, 'logs', l.id), cleanUndefined(l));
        }
        const deletedLogs = oldLogs.filter(ol => !newLogs.some(nl => nl.id === ol.id));
        for (const l of deletedLogs) {
          await deleteDoc(doc(db, 'karaokes', shopId, 'logs', l.id));
        }

        // Write settings to root karaoke doc
        if (!oldSettings || JSON.stringify(newSettings) !== JSON.stringify(oldSettings)) {
          await setDoc(doc(db, 'karaokes', shopId), cleanUndefined({
            karaokeId: shopId,
            settings: newSettings
          }));
        }

        // Surgically write User Accounts under the shop
        const oldShopUsers = oldUsers.filter(u => (u.shopId || 'default_shop') === shopId);
        const newShopUsers = newUsers.filter(u => (u.shopId || 'default_shop') === shopId);
        const changedShopUsers = newShopUsers.filter(nu => {
          const old = oldShopUsers.find(ou => ou.id === nu.id);
          return !old || JSON.stringify(nu) !== JSON.stringify(old);
        });
        for (const u of changedShopUsers) {
          await setDoc(doc(db, 'karaokes', shopId, 'accounts', u.id), cleanUndefined({
            ...u,
            karaokeId: shopId
          }));
        }
        const deletedShopUsers = oldShopUsers.filter(ou => !newShopUsers.some(nu => nu.id === ou.id));
        for (const u of deletedShopUsers) {
          await deleteDoc(doc(db, 'karaokes', shopId, 'accounts', u.id));
        }
      } catch (err) {
        console.error("Firestore sync save error:", err);
      }
    };
    saveToFirestoreInCg();

    // Broadcast change to other local tabs
    try {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.postMessage({
        type: 'SYNC_STATE',
        data: {
          currentUser,
          shopId,
          rooms: newRooms,
          hostesses: newHostesses,
          goods: newGoods,
          orders: newOrders,
          logs: newLogs,
          users: newUsers,
          settings: newSettings
        }
      });
      bc.close();
    } catch (e) {
      console.warn('BroadcastChannel error', e);
    }
  };

  const updateShopSettings = (newSettings: ShopSettings) => {
    const updatedLogs = addLogEntry('Cập nhật cài đặt', `Đã cập nhật thông tin quán: ${newSettings.shopName}`);
    syncAndSave(rooms, hostesses, goods, orders, updatedLogs, users, newSettings);
  };

  const setCurrentUser = (user: UserAccount | null) => {
    setCurrentUserVal(user);
    if (user) {
      localStorage.setItem('kar_current_user', JSON.stringify(user));
      loadShopData(user, registrations);
      
      const shopId = user.shopId || 'default_shop';
      const newLog: ActivityLog = {
        id: `L_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: user.displayName,
        role: user.role,
        action: 'Đăng nhập',
        details: `Chạy phiên làm việc với tài khoản ${user.displayName} (${user.role === 'manager' ? 'Quản lý' : 'Nhân viên'})`
      };
      
      const storedLogs = localStorage.getItem(`kar_logs_${shopId}`);
      const baseLogs: ActivityLog[] = storedLogs ? JSON.parse(storedLogs) : [];
      const updatedLogs = [newLog, ...baseLogs];
      
      const storedRooms = localStorage.getItem(`kar_rooms_${shopId}`);
      const storedHostesses = localStorage.getItem(`kar_hostesses_${shopId}`);
      const storedGoods = localStorage.getItem(`kar_goods_${shopId}`);
      const storedOrders = localStorage.getItem(`kar_orders_${shopId}`);
      const storedSettings = localStorage.getItem(`kar_settings_${shopId}`);
      
      const r = storedRooms ? JSON.parse(storedRooms) : initialRooms;
      const h = storedHostesses ? JSON.parse(storedHostesses) : initialHostesses;
      const g = storedGoods ? JSON.parse(storedGoods) : initialGoods;
      const o = storedOrders ? JSON.parse(storedOrders) : [];
      const s = storedSettings ? JSON.parse(storedSettings) : defaultSettings;
      
      syncAndSave(r, h, g, o, updatedLogs, users, s);
    } else {
      localStorage.removeItem('kar_current_user');
    }
  };

  // STORE MANAGER APPROVAL LOGIC
  const submitRegistration = async (fullName: string, email: string, shopName: string, phone: string, password?: string) => {
    const newRegId = `REG_${Date.now()}`;
    const newShopId = `shop_${Date.now()}`;
    const newReg: StoreRegistration = {
      id: newRegId,
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      shopName: shopName.trim(),
      phone: phone.trim(),
      password: password || '123456',
      createdAt: new Date().toISOString(),
      status: 'pending',
      shopId: newShopId
    };

    const updatedRegs = [newReg, ...registrations];
    setRegistrations(updatedRegs);
    localStorage.setItem('kar_store_registrations', JSON.stringify(updatedRegs));

    try {
      await setDoc(doc(db, 'pendingRegistrations', newRegId), cleanUndefined({
        ...newReg,
        karaokeId: newShopId
      }));
    } catch (err) {
      console.error("Failed to write registration to Firestore:", err);
    }
  };

  const approveRegistration = async (registrationId: string) => {
    const match = registrations.find(r => r.id === registrationId);
    if (match) {
      // 1. Remove this registration from registrations state and delete it from Firestore
      const updatedRegs = registrations.filter(reg => reg.id !== registrationId);
      setRegistrations(updatedRegs);
      localStorage.setItem('kar_store_registrations', JSON.stringify(updatedRegs));

      try {
        await deleteDoc(doc(db, 'pendingRegistrations', registrationId));
      } catch (err) {
        console.error("Failed to delete registration from Firestore upon approval:", err);
      }

      // 2. Create the new user with role 'manager' carrying the karaoke details
      const newUser: UserAccount = {
        id: `U_${match.id}`,
        email: match.email,
        phone: match.phone,
        displayName: match.fullName,
        role: 'manager',
        password: match.password || '123456',
        shopId: match.shopId,
        karaokeId: match.shopId
      };

      const filteredUsers = users.filter(u => u.email !== match.email);
      const updatedUsers = [...filteredUsers, newUser];
      setUsers(updatedUsers);
      localStorage.setItem('kar_users', JSON.stringify(updatedUsers));

      const shopId = match.shopId;
      try {
        await setDoc(doc(db, 'karaokes', shopId, 'accounts', newUser.id), cleanUndefined({
          ...newUser,
          karaokeId: shopId
        }));
      } catch (err) {
        console.error("Failed to save approved manager in Firestore:", err);
      }

      // 3. Setup default custom settings for the approved shop
      localStorage.setItem(`kar_rooms_${shopId}`, JSON.stringify([]));
      localStorage.setItem(`kar_hostesses_${shopId}`, JSON.stringify([]));
      localStorage.setItem(`kar_goods_${shopId}`, JSON.stringify([]));
      localStorage.setItem(`kar_orders_${shopId}`, JSON.stringify([]));

      const customStoreSettings: ShopSettings = {
        shopName: match.shopName.toUpperCase(),
        address: 'Địa chỉ chưa cập nhật',
        phone: match.phone,
        wifiName: 'FreeWiFi',
        wifiPassword: '88888888',
        slogan: 'ĐỒNG BỘ THỜI GIAN THỰC'
      };
      localStorage.setItem(`kar_settings_${shopId}`, JSON.stringify(customStoreSettings));
      try {
        await setDoc(doc(db, 'karaokes', shopId), cleanUndefined({
          karaokeId: shopId,
          settings: customStoreSettings
        }));
      } catch (err) {
        console.error("Failed to write default settings to Firestore:", err);
      }
    }
  };

  const rejectRegistration = async (registrationId: string) => {
    const match = registrations.find(r => r.id === registrationId);
    if (match) {
      const updatedRegDoc = { ...match, status: 'rejected' as const };
      const updatedRegs = registrations.map(reg => reg.id === registrationId ? updatedRegDoc : reg);
      setRegistrations(updatedRegs);
      localStorage.setItem('kar_store_registrations', JSON.stringify(updatedRegs));

      try {
        await setDoc(doc(db, 'pendingRegistrations', registrationId), cleanUndefined(updatedRegDoc));
      } catch (err) {
        console.error("Failed to reject registration in Firestore:", err);
      }
    }
  };

  const deleteRegistration = async (registrationId: string) => {
    const updatedRegs = registrations.filter(reg => reg.id !== registrationId);
    setRegistrations(updatedRegs);
    localStorage.setItem('kar_store_registrations', JSON.stringify(updatedRegs));
    try {
      await deleteDoc(doc(db, 'pendingRegistrations', registrationId));
    } catch (err) {
      console.error("Failed to delete registration from Firestore:", err);
    }
  };

  const clearAllRegistrations = async () => {
    setRegistrations([]);
    localStorage.removeItem('kar_store_registrations');
    try {
      const snap = await getDocs(collection(db, 'pendingRegistrations'));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'pendingRegistrations', d.id));
      }
    } catch (err) {
      console.error("Failed to clear registrations in Firestore:", err);
    }
  };

  const logout = () => {
    setCurrentUserVal(null);
    localStorage.removeItem('kar_current_user');
  };

  // ROOM ACTIONS
  const startRoom = (roomId: string) => {
    const newRooms = rooms.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          status: 'occupied' as const,
          activeSession: {
            startTime: new Date().toISOString(),
            hostesses: [],
            items: []
          }
        };
      }
      return room;
    });

    const roomName = rooms.find(r => r.id === roomId)?.name || roomId;
    const updatedLogs = addLogEntry('Mở phòng', `Bắt đầu tính giờ sử dụng cho ${roomName}`);
    syncAndSave(newRooms, hostesses, goods, orders, updatedLogs);
  };

  const addGoodsToRoom = (roomId: string, goodsId: string, quantity: number) => {
    const itemInfo = goods.find(g => g.id === goodsId);
    if (!itemInfo) return;

    const newRooms = rooms.map(room => {
      if (room.id === roomId && room.activeSession) {
        const existingItemIndex = room.activeSession.items.findIndex(i => i.id === goodsId);
        let updatedItems = [...room.activeSession.items];

        if (existingItemIndex > -1) {
          const newQty = updatedItems[existingItemIndex].quantity + quantity;
          if (newQty <= 0) {
            updatedItems.splice(existingItemIndex, 1);
          } else {
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              quantity: newQty
            };
          }
        } else if (quantity > 0) {
          updatedItems.push({
            id: goodsId,
            name: itemInfo.name,
            price: itemInfo.price,
            quantity: quantity,
            unit: itemInfo.unit,
            orderedAt: new Date().toISOString()
          });
        }

        return {
          ...room,
          activeSession: {
            ...room.activeSession,
            items: updatedItems
          }
        };
      }
      return room;
    });

    const roomName = rooms.find(r => r.id === roomId)?.name || roomId;
    const qtyText = quantity > 0 ? `gọi thêm ${quantity}` : `giảm bớt ${Math.abs(quantity)}`;
    const updatedLogs = addLogEntry(
      'Gọi hàng hóa',
      `${roomName} ${qtyText} ${itemInfo.name} (${itemInfo.price.toLocaleString()}đ/${itemInfo.unit})`
    );
    syncAndSave(newRooms, hostesses, goods, orders, updatedLogs);
  };

  const setGoodsQuantityInRoom = (roomId: string, goodsId: string, newQuantity: number) => {
    const itemInfo = goods.find(g => g.id === goodsId);
    if (!itemInfo) return;

    const newRooms = rooms.map(room => {
      if (room.id === roomId && room.activeSession) {
        const existingItemIndex = room.activeSession.items.findIndex(i => i.id === goodsId);
        let updatedItems = [...room.activeSession.items];

        if (existingItemIndex > -1) {
          if (newQuantity <= 0) {
            updatedItems.splice(existingItemIndex, 1);
          } else {
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              quantity: newQuantity
            };
          }
        } else if (newQuantity > 0) {
          updatedItems.push({
            id: goodsId,
            name: itemInfo.name,
            price: itemInfo.price,
            quantity: newQuantity,
            unit: itemInfo.unit,
            orderedAt: new Date().toISOString()
          });
        }

        return {
          ...room,
          activeSession: {
            ...room.activeSession,
            items: updatedItems
          }
        };
      }
      return room;
    });

    const roomName = rooms.find(r => r.id === roomId)?.name || roomId;
    const updatedLogs = addLogEntry(
      'Sửa số lượng hàng hóa',
      `${roomName} - ${itemInfo.name}: ${newQuantity} ${itemInfo.unit}`
    );
    syncAndSave(newRooms, hostesses, goods, orders, updatedLogs);
  };

  const addHostessToRoom = (roomId: string, hostessId: string, customHiredAt?: string) => {
    const hostessInfo = hostesses.find(h => h.id === hostessId);
    const roomInfo = rooms.find(r => r.id === roomId);
    if (!hostessInfo || !roomInfo || !roomInfo.activeSession) return;

    // A hostess can serve multiple different rooms concurrently, but inside ONE room,
    // they should only have at most one active (ongoing with undefined leftAt) session to avoid logical duplicates.
    const hasActiveSessionInRoom = roomInfo.activeSession.hostesses.some(
      h => h.hostessId === hostessId && !h.leftAt
    );
    if (hasActiveSessionInRoom) return;

    // Build unique hostess session ID for tracking independent intervals
    const uniqueSessionId = `HS_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    // Update hostess state to busy and link to current room (or the newly joined one)
    const newHostesses = hostesses.map(h => {
      if (h.id === hostessId) {
        return { ...h, status: 'busy' as const, currentRoomId: roomId };
      }
      return h;
    });

    // Update room with a new hired interval
    const newRooms = rooms.map(room => {
      if (room.id === roomId && room.activeSession) {
        const updatedHostesses: HiredHostess[] = [
          ...room.activeSession.hostesses,
          {
            id: uniqueSessionId,
            hostessId: hostessId,
            name: hostessInfo.name,
            pricePerHour: hostessInfo.pricePerHour,
            hiredAt: customHiredAt || new Date().toISOString()
          }
        ];
        return {
          ...room,
          activeSession: {
            ...room.activeSession,
            hostesses: updatedHostesses
          }
        };
      }
      return room;
    });

    const updatedLogs = addLogEntry('Điều tiếp viên', `${roomInfo.name} gọi tiếp viên ${hostessInfo.name}`);
    syncAndSave(newRooms, newHostesses, goods, orders, updatedLogs);
  };

  const removeHostessFromRoom = (roomId: string, hostessSessionId: string, customLeftAt?: string) => {
    const roomInfo = rooms.find(r => r.id === roomId);
    if (!roomInfo || !roomInfo.activeSession) return;

    const sessionToClose = roomInfo.activeSession.hostesses.find(h => h.id === hostessSessionId);
    if (!sessionToClose) return;

    const actualLeftAt = customLeftAt || new Date().toISOString();

    // Mark completion time in the specific service session
    const newRooms = rooms.map(room => {
      if (room.id === roomId && room.activeSession) {
        const updatedHostesses = room.activeSession.hostesses.map(h => {
          if (h.id === hostessSessionId) {
            return { ...h, leftAt: actualLeftAt };
          }
          return h;
        });
        return {
          ...room,
          activeSession: {
            ...room.activeSession,
            hostesses: updatedHostesses
          }
        };
      }
      return room;
    });

    // Dynamically calculate if hostess is still active in any other rooms
    const hostessId = sessionToClose.hostessId;
    let stillBusy = false;
    let otherActiveRoomId: string | null = null;
    newRooms.forEach(r => {
      if (r.activeSession) {
        const hasOpen = r.activeSession.hostesses.some(h => h.hostessId === hostessId && !h.leftAt);
        if (hasOpen) {
          stillBusy = true;
          otherActiveRoomId = r.id;
        }
      }
    });

    const newHostesses = hostesses.map(h => {
      if (h.id === hostessId) {
        return {
          ...h,
          status: (stillBusy ? 'busy' : 'available') as 'busy' | 'available',
          currentRoomId: otherActiveRoomId
        };
      }
      return h;
    });

    const updatedLogs = addLogEntry('Bỏ tiếp viên', `${roomInfo.name} ngưng tiếp viên ${sessionToClose.name}`);
    syncAndSave(newRooms, newHostesses, goods, orders, updatedLogs);
  };

  const resumeHostessSession = (roomId: string, sessionId: string) => {
    const roomInfo = rooms.find(r => r.id === roomId);
    if (!roomInfo || !roomInfo.activeSession) return;

    const sessionToResume = roomInfo.activeSession.hostesses.find(h => h.id === sessionId);
    if (!sessionToResume) return;

    // Reset leftAt time on this session to make it open (active) again
    const newRooms = rooms.map(room => {
      if (room.id === roomId && room.activeSession) {
        const updatedHostesses = room.activeSession.hostesses.map(h => {
          if (h.id === sessionId) {
            return {
              ...h,
              leftAt: undefined
            };
          }
          return h;
        });
        return {
          ...room,
          activeSession: {
            ...room.activeSession,
            hostesses: updatedHostesses
          }
        };
      }
      return room;
    });

    // Mark hostess status as busy
    const newHostesses = hostesses.map(h => {
      if (h.id === sessionToResume.hostessId) {
        return {
          ...h,
          status: 'busy' as const,
          currentRoomId: roomId
        };
      }
      return h;
    });

    const updatedLogs = addLogEntry('Tiếp tục phục vụ', `Tiếp viên ${sessionToResume.name} tiếp tục phục vụ tại phòng ${roomInfo.name}`);
    syncAndSave(newRooms, newHostesses, goods, orders, updatedLogs);
  };

  const deleteHostessSession = (roomId: string, sessionId: string) => {
    const roomInfo = rooms.find(r => r.id === roomId);
    if (!roomInfo || !roomInfo.activeSession) return;

    const sessionToDelete = roomInfo.activeSession.hostesses.find(h => h.id === sessionId);
    if (!sessionToDelete) return;

    const newRooms = rooms.map(room => {
      if (room.id === roomId && room.activeSession) {
        return {
          ...room,
          activeSession: {
            ...room.activeSession,
            hostesses: room.activeSession.hostesses.filter(h => h.id !== sessionId)
          }
        };
      }
      return room;
    });

    const hostessId = sessionToDelete.hostessId;
    let stillBusy = false;
    let otherActiveRoomId: string | null = null;
    newRooms.forEach(r => {
      if (r.activeSession) {
        const hasOpen = r.activeSession.hostesses.some(h => h.hostessId === hostessId && !h.leftAt);
        if (hasOpen) {
          stillBusy = true;
          otherActiveRoomId = r.id;
        }
      }
    });

    const newHostesses = hostesses.map(h => {
      if (h.id === hostessId) {
        return {
          ...h,
          status: (stillBusy ? 'busy' : 'available') as 'busy' | 'available',
          currentRoomId: otherActiveRoomId
        };
      }
      return h;
    });

    const updatedLogs = addLogEntry('Xóa lượt tiếp viên', `Xóa lượt phục vụ của tiếp viên ${sessionToDelete.name} khỏi phòng ${roomInfo.name}`);
    syncAndSave(newRooms, newHostesses, goods, orders, updatedLogs);
  };

  const updateHostessSessionTimes = (roomId: string, sessionId: string, hiredAt: string, leftAt?: string) => {
    const roomInfo = rooms.find(r => r.id === roomId);
    if (!roomInfo || !roomInfo.activeSession) return;

    const sessionToUpdate = roomInfo.activeSession.hostesses.find(h => h.id === sessionId);
    if (!sessionToUpdate) return;

    const newRooms = rooms.map(room => {
      if (room.id === roomId && room.activeSession) {
        const updatedHostesses = room.activeSession.hostesses.map(h => {
          if (h.id === sessionId) {
            return {
              ...h,
              hiredAt,
              leftAt: leftAt || undefined
            };
          }
          return h;
        });
        return {
          ...room,
          activeSession: {
            ...room.activeSession,
            hostesses: updatedHostesses
          }
        };
      }
      return room;
    });

    const hostessId = sessionToUpdate.hostessId;
    let stillBusy = false;
    let otherActiveRoomId: string | null = null;
    newRooms.forEach(r => {
      if (r.activeSession) {
        const hasOpen = r.activeSession.hostesses.some(h => h.hostessId === hostessId && !h.leftAt);
        if (hasOpen) {
          stillBusy = true;
          otherActiveRoomId = r.id;
        }
      }
    });

    const newHostesses = hostesses.map(h => {
      if (h.id === hostessId) {
        return {
          ...h,
          status: (stillBusy ? 'busy' : 'available') as 'busy' | 'available',
          currentRoomId: otherActiveRoomId
        };
      }
      return h;
    });

    const updatedLogs = addLogEntry('Sửa giờ tiếp viên', `Thay đổi giờ phục vụ tiếp viên ${sessionToUpdate.name} tại phòng ${roomInfo.name}`);
    syncAndSave(newRooms, newHostesses, goods, orders, updatedLogs);
  };

  const updateRoomSessionTimes = (roomId: string, startTime: string) => {
    const roomInfo = rooms.find(r => r.id === roomId);
    if (!roomInfo || !roomInfo.activeSession) return;

    const newRooms = rooms.map(room => {
      if (room.id === roomId && room.activeSession) {
        return {
          ...room,
          activeSession: {
            ...room.activeSession,
            startTime
          }
        };
      }
      return room;
    });

    const d = new Date(startTime);
    const formattedTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const updatedLogs = addLogEntry('Sửa giờ phòng', `Thay đổi giờ vào phòng của ${roomInfo.name} thành ${formattedTime}`);
    syncAndSave(newRooms, hostesses, goods, orders, updatedLogs);
  };

  const checkoutRoom = (roomId: string, customEndTime?: string): Order | null => {
    const room = rooms.find(r => r.id === roomId);
    if (!room || !room.activeSession) return null;

    const checkoutTime = customEndTime || new Date().toISOString();
    const startTime = room.activeSession.startTime;

    // Calculate room usage duration rounded to the minute ignoring seconds
    const startClean = new Date(startTime);
    startClean.setSeconds(0, 0);
    const endClean = new Date(checkoutTime);
    endClean.setSeconds(0, 0);
    const durationMinutes = Math.max(0, Math.floor((endClean.getTime() - startClean.getTime()) / 60000));

    // Room charge
    const roomCharge = Math.round((durationMinutes / 60) * room.hourlyPrice);

    // Hostesses charges with custom worked duration for each hostess rounded to minute ignoring seconds
    let hostessCharge = 0;
    const computedHostesses = room.activeSession.hostesses.map(h => {
      const hiredClean = new Date(h.hiredAt);
      hiredClean.setSeconds(0, 0);
      const exitClean = new Date(h.leftAt ? h.leftAt : checkoutTime);
      exitClean.setSeconds(0, 0);
      
      const hDurationMinutes = Math.max(0, Math.floor((exitClean.getTime() - hiredClean.getTime()) / 60000));
      const cost = Math.round((hDurationMinutes / 60) * h.pricePerHour);
      
      hostessCharge += cost;
      return h;
    });

    // Goods charges
    let goodsCharge = 0;
    room.activeSession.items.forEach(item => {
      goodsCharge += item.price * item.quantity;
    });

    const totalAmount = roomCharge + hostessCharge + goodsCharge;

    const newOrder: Order = {
      id: `HD_${Date.now()}`,
      roomId: room.id,
      roomName: room.name,
      roomType: room.type,
      hourlyPrice: room.hourlyPrice,
      startTime: startTime,
      endTime: checkoutTime,
      durationMinutes,
      roomCharge,
      hostessCharge,
      goodsCharge,
      totalAmount,
      hostesses: room.activeSession.hostesses,
      items: room.activeSession.items,
      createdAt: checkoutTime,
      createdBy: currentUser.displayName
    };

    // Free hostesses specifically involved in this room's sessions that are still active (leftAt is undefined)
    const hostessIdsToFree = room.activeSession.hostesses
      .filter(h => !h.leftAt)
      .map(h => h.hostessId);

    // Filter to see if they are still serving inside another active room
    const newHostesses = hostesses.map(h => {
      if (hostessIdsToFree.includes(h.id)) {
        // Double check if she is serving in any other active room
        const stillBusyInOther = rooms.some(r => r.id !== roomId && r.activeSession && r.activeSession.hostesses.some(subH => subH.hostessId === h.id && !subH.leftAt));
        if (!stillBusyInOther) {
          return { ...h, status: 'available' as const, currentRoomId: null };
        }
      }
      return h;
    });

    // Move room to cleaning status and clear session data
    const newRooms = rooms.map(r => {
      if (r.id === roomId) {
        return {
          ...r,
          status: 'cleaning' as const,
          activeSession: undefined
        };
      }
      return r;
    });

    const updatedOrders = [newOrder, ...orders];
    const updatedLogs = addLogEntry(
      'Thanh toán',
      `Đã thu tiền ${room.name}. Tổng tiền: ${totalAmount.toLocaleString()}đ (Thời gian: ${durationMinutes} phút)`
    );

    syncAndSave(newRooms, newHostesses, goods, updatedOrders, updatedLogs);
    return newOrder;
  };

  const cancelRoom = (roomId: string, reason: string) => {
    if (currentUser.role === 'staff') {
      alert('Tài khoản nhân viên không có quyền hủy phòng!');
      return;
    }
    const room = rooms.find(r => r.id === roomId);
    if (!room || !room.activeSession) return;

    const checkoutTime = new Date().toISOString();
    const startTime = room.activeSession.startTime;

    const startClean = new Date(startTime);
    startClean.setSeconds(0, 0);
    const endClean = new Date(checkoutTime);
    endClean.setSeconds(0, 0);
    const durationMinutes = Math.max(0, Math.floor((endClean.getTime() - startClean.getTime()) / 60000));

    // Room charge
    const roomCharge = Math.round((durationMinutes / 60) * room.hourlyPrice);

    // Hostesses charges with custom worked duration for each hostess rounded to minute ignoring seconds
    let hostessCharge = 0;
    const computedHostesses = room.activeSession.hostesses.map(h => {
      const hiredClean = new Date(h.hiredAt);
      hiredClean.setSeconds(0, 0);
      const exitClean = new Date(h.leftAt ? h.leftAt : checkoutTime);
      exitClean.setSeconds(0, 0);
      
      const hDurationMinutes = Math.max(0, Math.floor((exitClean.getTime() - hiredClean.getTime()) / 60000));
      const cost = Math.round((hDurationMinutes / 60) * h.pricePerHour);
      
      hostessCharge += cost;
      return h;
    });

    // Goods charges
    let goodsCharge = 0;
    room.activeSession.items.forEach(item => {
      goodsCharge += item.price * item.quantity;
    });

    const totalAmount = roomCharge + hostessCharge + goodsCharge;

    const cancelledOrder: Order = {
      id: `HD_HUY_${Date.now()}`,
      roomId: room.id,
      roomName: room.name,
      roomType: room.type,
      hourlyPrice: room.hourlyPrice,
      startTime: startTime,
      endTime: checkoutTime,
      durationMinutes,
      roomCharge,
      hostessCharge,
      goodsCharge,
      totalAmount,
      hostesses: room.activeSession.hostesses,
      items: room.activeSession.items,
      createdAt: checkoutTime,
      createdBy: currentUser.displayName,
      isCancelled: true,
      cancelReason: reason
    };

    // Free hostesses specifically involved in this room's sessions that are still active (leftAt is undefined)
    const hostessIdsToFree = room.activeSession.hostesses
      .filter(h => !h.leftAt)
      .map(h => h.hostessId);

    const newHostesses = hostesses.map(h => {
      if (hostessIdsToFree.includes(h.id)) {
        const stillBusyInOther = rooms.some(r => r.id !== roomId && r.activeSession && r.activeSession.hostesses.some(subH => subH.hostessId === h.id && !subH.leftAt));
        if (!stillBusyInOther) {
          return { ...h, status: 'available' as const, currentRoomId: null };
        }
      }
      return h;
    });

    // Reset room status to 'available' and clear activeSession
    const newRooms = rooms.map(r => {
      if (r.id === roomId) {
        return {
          ...r,
          status: 'available' as const,
          activeSession: undefined
        };
      }
      return r;
    });

    const updatedOrders = [cancelledOrder, ...orders];
    const updatedLogs = addLogEntry(
      'Hủy phòng',
      `Đã hủy phòng ${room.name}. Lý do: ${reason}`
    );

    syncAndSave(newRooms, newHostesses, goods, updatedOrders, updatedLogs);
  };

  const reopenOrder = (orderId: string): boolean => {
    if (currentUser.role === 'staff') {
      alert('Tài khoản nhân viên không có quyền mở lại phòng!');
      return false;
    }
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;

    const room = rooms.find(r => r.id === order.roomId);
    if (!room || room.status === 'occupied') return false;

    const newRooms = rooms.map(r => {
      if (r.id === order.roomId) {
        return {
          ...r,
          status: 'occupied' as const,
          activeSession: {
            startTime: order.startTime,
            hostesses: order.hostesses,
            items: order.items
          }
        };
      }
      return r;
    });

    const newHostesses = hostesses.map(h => {
      const orderHostess = order.hostesses.find(oh => oh.hostessId === h.id && !oh.leftAt);
      if (orderHostess) {
        const busyElsewhere = rooms.some(r => r.id !== order.roomId && r.activeSession?.hostesses.some(subH => subH.hostessId === h.id && !subH.leftAt));
        if (!busyElsewhere) {
          return {
            ...h,
            status: 'busy' as const,
            currentRoomId: order.roomId
          };
        }
      }
      return h;
    });

    const updatedOrders = orders.filter(o => o.id !== orderId);
    const updatedLogs = addLogEntry('Mở lại phòng', `Mở lại phòng ${order.roomName} từ hóa đơn đã thanh toán ${order.id}`);
    syncAndSave(newRooms, newHostesses, goods, updatedOrders, updatedLogs);
    return true;
  };

  const deleteOrder = (orderId: string): boolean => {
    if (currentUser.role === 'staff') {
      alert('Tài khoản nhân viên không có quyền xóa hóa đơn!');
      return false;
    }
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;

    const shopId = currentUser.shopId || 'default_shop';
    deleteDoc(doc(db, 'karaokes', shopId, 'invoices', orderId)).catch(err => console.error(err));

    const updatedOrders = orders.filter(o => o.id !== orderId);
    const updatedLogs = addLogEntry('Xóa hóa đơn', `Đã xóa hóa đơn ${order.id} của phòng ${order.roomName} - Trị giá ${order.totalAmount.toLocaleString()}đ`);
    syncAndSave(rooms, hostesses, goods, updatedOrders, updatedLogs);
    return true;
  };

  const completeCleaning = (roomId: string) => {
    const newRooms = rooms.map(room => {
      if (room.id === roomId) {
        return { ...room, status: 'available' as const };
      }
      return room;
    });

    const roomName = rooms.find(r => r.id === roomId)?.name || roomId;
    const updatedLogs = addLogEntry('Dọn phòng dẹp', `Phòng ${roomName} đã dọn dẹp xong, sẵn sàng đón khách`);
    syncAndSave(newRooms, hostesses, goods, orders, updatedLogs);
  };

  const updateRoomPrice = (roomId: string, price: number) => {
    const newRooms = rooms.map(room => {
      if (room.id === roomId) {
        return { ...room, hourlyPrice: price };
      }
      return room;
    });

    const roomName = rooms.find(r => r.id === roomId)?.name || roomId;
    const updatedLogs = addLogEntry('Cập nhật giá phòng', `Thay đổi giá giờ hát của ${roomName} thành ${price.toLocaleString()}đ/giờ`);
    syncAndSave(newRooms, hostesses, goods, orders, updatedLogs);
  };

  // HOSTESS CRUD
  const addHostess = (hostessData: Omit<Hostess, 'status' | 'currentRoomId'>) => {
    const newHostess: Hostess = {
      ...hostessData,
      status: 'available',
      currentRoomId: null
    };
    const newHostesses = [...hostesses, newHostess];
    const updatedLogs = addLogEntry('Thêm tiếp viên', `Thêm mới tiếp viên ${newHostess.name} với giá ${newHostess.pricePerHour.toLocaleString()}đ/giờ`);
    syncAndSave(rooms, newHostesses, goods, orders, updatedLogs);
  };

  const updateHostess = (updatedHostess: Hostess) => {
    const newHostesses = hostesses.map(h => h.id === updatedHostess.id ? updatedHostess : h);
    const updatedLogs = addLogEntry('Sửa tiếp viên', `Cập nhật thông tin tiếp viên ${updatedHostess.name}`);
    syncAndSave(rooms, newHostesses, goods, orders, updatedLogs);
  };

  const deleteHostess = (hostessId: string) => {
    const hostessName = hostesses.find(h => h.id === hostessId)?.name || hostessId;
    const shopId = currentUser.shopId || 'default_shop';
    deleteDoc(doc(db, 'karaokes', shopId, 'hostesses', hostessId)).catch(err => console.error(err));

    const newHostesses = hostesses.filter(h => h.id !== hostessId);
    const updatedLogs = addLogEntry('Xóa tiếp viên', `Đã xóa tiếp viên ${hostessName}`);
    syncAndSave(rooms, newHostesses, goods, orders, updatedLogs);
  };

  // GOODS CRUD
  const addGoods = (itemData: Omit<Goods, 'id'>) => {
    const newGoodsItem: Goods = {
      ...itemData,
      id: `G_${Date.now()}`
    };
    const newGoods = [...goods, newGoodsItem];
    const updatedLogs = addLogEntry('Thêm hàng hóa', `Thêm mặt hàng ${newGoodsItem.name} (${newGoodsItem.price.toLocaleString()}đ/${newGoodsItem.unit})`);
    syncAndSave(rooms, hostesses, newGoods, orders, updatedLogs);
  };

  const updateGoods = (updatedItem: Goods) => {
    const newGoods = goods.map(g => g.id === updatedItem.id ? updatedItem : g);
    const updatedLogs = addLogEntry('Sửa hàng hóa', `Cập nhật thông tin mặt hàng ${updatedItem.name}`);
    syncAndSave(rooms, hostesses, newGoods, orders, updatedLogs);
  };

  const deleteGoods = (itemId: string) => {
    const itemName = goods.find(g => g.id === itemId)?.name || itemId;
    const shopId = currentUser.shopId || 'default_shop';
    deleteDoc(doc(db, 'karaokes', shopId, 'products', itemId)).catch(err => console.error(err));

    const newGoods = goods.filter(g => g.id !== itemId);
    const updatedLogs = addLogEntry('Xóa hàng hóa', `Đã xóa mặt hàng ${itemName}`);
    syncAndSave(rooms, hostesses, newGoods, orders, updatedLogs);
  };

  // ROOM CRUD
  const addRoom = (name: string, type: RoomType, hourlyPrice: number) => {
    const newRoom: Room = {
      id: `R_${Date.now()}`,
      name,
      type,
      status: 'available' as const,
      hourlyPrice
    };
    const newRooms = [...rooms, newRoom];
    const updatedLogs = addLogEntry('Thêm phòng hát', `Đã tạo phòng mới: ${name} (${type === 'vip' ? 'VIP' : 'Thường'}) - Giá: ${hourlyPrice.toLocaleString()}đ/h`);
    syncAndSave(newRooms, hostesses, goods, orders, updatedLogs);
  };

  const updateRoom = (roomId: string, name: string, type: RoomType, hourlyPrice: number) => {
    const newRooms = rooms.map(r => {
      if (r.id === roomId) {
        return {
          ...r,
          name,
          type,
          hourlyPrice
        };
      }
      return r;
    });
    const updatedLogs = addLogEntry('Sửa phòng hát', `Đã cập nhật thông tin phòng: ${name} - Giá: ${hourlyPrice.toLocaleString()}đ/h`);
    syncAndSave(newRooms, hostesses, goods, orders, updatedLogs);
  };

  const deleteRoom = (roomId: string) => {
    const roomName = rooms.find(r => r.id === roomId)?.name || roomId;
    const shopId = currentUser.shopId || 'default_shop';
    deleteDoc(doc(db, 'karaokes', shopId, 'rooms', roomId)).catch(err => console.error(err));

    const newRooms = rooms.filter(r => r.id !== roomId);
    const updatedLogs = addLogEntry('Xóa phòng hát', `Đã xóa phòng hát: ${roomName}`);
    syncAndSave(newRooms, hostesses, goods, orders, updatedLogs);
  };

  // USER ACCOUNTS
  const updateUserRole = (userId: string, role: UserRole) => {
    const newUsers = users.map(user => {
      if (user.id === userId) {
        return { ...user, role };
      }
      return user;
    });

    const name = users.find(u => u.id === userId)?.displayName || userId;
    const updatedLogs = addLogEntry('Phân quyền tài khoản', `Thay đổi quyền của tài khoản ${name} thành ${role === 'manager' ? 'Quản lý' : 'Nhân viên'}`);
    syncAndSave(rooms, hostesses, goods, orders, updatedLogs, newUsers);
  };

  const addUserAccount = async (displayName: string, email: string, role: UserRole, password?: string) => {
    if (!currentUser) return;
    const shopId = currentUser.shopId || 'default_shop';
    const newUserId = `U_${Date.now()}`;
    const loginIdentifier = email.trim().toLowerCase();
    const isEmail = loginIdentifier.includes('@');

    const newUser: UserAccount = {
      id: newUserId,
      email: loginIdentifier,
      phone: isEmail ? undefined : loginIdentifier,
      displayName: displayName.trim(),
      role,
      password: password || '123456',
      shopId,
      karaokeId: shopId
    };

    const updatedUsers = [...users.filter(u => u.email !== newUser.email), newUser];
    setUsers(updatedUsers);
    localStorage.setItem('kar_users', JSON.stringify(updatedUsers));

    try {
      await setDoc(doc(db, 'karaokes', shopId, 'accounts', newUser.id), cleanUndefined({
        ...newUser,
        karaokeId: shopId
      }));
      
      const updatedLogs = addLogEntry('Tạo tài khoản', `Đã tạo tài khoản nhân sự: ${displayName} (${role === 'manager' ? 'Quản lý' : 'Nhân viên'})`);
      syncAndSave(rooms, hostesses, goods, orders, updatedLogs, updatedUsers);
    } catch (err) {
      console.error("Failed to add user account in Firestore/Log:", err);
    }
  };

  const deleteUserAccount = async (userId: string) => {
    if (!currentUser || currentUser.id === userId) return; // Prevent deleting self
    
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;
    
    // Only allow manager to delete user from their own shop
    const shopId = currentUser.shopId || 'default_shop';
    if (userToDelete.shopId !== shopId) return;

    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    localStorage.setItem('kar_users', JSON.stringify(updatedUsers));

    try {
      await deleteDoc(doc(db, 'karaokes', shopId, 'accounts', userId));
      
      const updatedLogs = addLogEntry('Xóa tài khoản', `Đã xóa tài khoản nhân sự: ${userToDelete.displayName}`);
      syncAndSave(rooms, hostesses, goods, orders, updatedLogs, updatedUsers);
    } catch (err) {
      console.error("Failed to delete user account from Firestore:", err);
    }
  };

  // Reset System Data to Default
  const clearAllData = async () => {
    const shopId = currentUser?.shopId || 'default_shop';

    // Delete unified and nested subcollections
    try {
      const collections = ['rooms', 'hostesses', 'products', 'invoices', 'logs', 'accounts'];
      for (const colName of collections) {
        const snap = await getDocs(collection(db, 'karaokes', shopId, colName));
        for (const docObj of snap.docs) {
          await deleteDoc(doc(db, 'karaokes', shopId, colName, docObj.id));
        }
      }
      await deleteDoc(doc(db, 'karaokes', shopId));
      await deleteDoc(doc(db, 'shops', shopId));
    } catch (e) {
      console.error("Failed to clear Firestore nested collections:", e);
    }

    localStorage.removeItem(`kar_rooms_${shopId}`);
    localStorage.removeItem(`kar_hostesses_${shopId}`);
    localStorage.removeItem(`kar_goods_${shopId}`);
    localStorage.removeItem(`kar_orders_${shopId}`);
    localStorage.removeItem(`kar_logs_${shopId}`);
    localStorage.removeItem(`kar_settings_${shopId}`);

    setRooms(initialRooms);
    setHostesses(initialHostesses);
    setGoods(initialGoods);
    setOrders([]);
    
    const dName = currentUser ? currentUser.displayName : 'Hệ thống';
    const initLogs = createInitialLogsForShop(dName, shopId);
    setLogs(initLogs);
    setSettings(defaultSettings);

    // Broadcast clear
    try {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.postMessage({
        type: 'SYNC_STATE',
        data: {
          currentUser,
          shopId,
          rooms: initialRooms,
          hostesses: initialHostesses,
          goods: initialGoods,
          orders: [],
          logs: initLogs,
          users,
          settings: defaultSettings
        }
      });
      bc.close();
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        rooms,
        hostesses,
        goods,
        orders,
        logs,
        users,
        currentUser,
        setCurrentUser,
        isLoading,
        settings,
        updateShopSettings,
        startRoom,
        addGoodsToRoom,
        setGoodsQuantityInRoom,
        addHostessToRoom,
        removeHostessFromRoom,
        resumeHostessSession,
        deleteHostessSession,
        updateHostessSessionTimes,
        updateRoomSessionTimes,
        checkoutRoom,
        cancelRoom,
        reopenOrder,
        deleteOrder,
        completeCleaning,
        updateRoomPrice,
        addRoom,
        updateRoom,
        deleteRoom,
        addHostess,
        updateHostess,
        deleteHostess,
        addGoods,
        updateGoods,
        deleteGoods,
        updateUserRole,
        addUserAccount,
        deleteUserAccount,
        clearAllData,
        registrations,
        submitRegistration,
        approveRegistration,
        rejectRegistration,
        deleteRegistration,
        clearAllRegistrations,
        logout,
        theme,
        toggleTheme
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
};
