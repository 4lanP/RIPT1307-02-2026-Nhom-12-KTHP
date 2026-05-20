export interface User {
  id: number | string;
  full_name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'KITCHEN' | 'WAITER';
  is_active?: boolean;
  created_at?: string;
}

export interface Session {
  id: number | string;
  table_id: number | string;
  session_token: string;
  status: 'ACTIVE' | 'CLOSED';
  orders: Order[];
  created_at: string;
  closed_at?: string;
  total_amount?: number;
}

export interface Table {
  id: number | string;
  name: string;
  capacity: number;
  status: 'EMPTY' | 'OCCUPIED' | 'RESERVED';
  current_session_id?: number | string | null;
  current_session?: Session | null;
}

export interface QRCode {
  id: number | string;
  table_id: number | string;
  table_name?: string;
  code: string;
  is_active: boolean;
  created_at?: string;
}

export interface Category {
  id: number | string;
  name: string;
  description?: string;
  priority?: number;
}

export interface OptionValue {
  id: number | string;
  value_name: string;
  price_adjustment: number;
  is_default: boolean;
}

export interface MenuItemOption {
  id: number | string;
  item_id: number | string;
  name: string;
  is_required: boolean;
  selection_type: 'SINGLE' | 'MULTIPLE';
  values: OptionValue[];
}

export interface MenuItem {
  id: number | string;
  name: string;
  description?: string;
  base_price: number;
  category_id: number | string;
  is_available: boolean;
  quota?: number;
  original_quota?: number;
  image_url?: string;
  options?: MenuItemOption[];
}

export interface OrderItemOption {
  option_name: string;
  value_name: string;
  price_adjustment: number;
}

export interface OrderItem {
  id: number | string;
  order_id: number | string;
  item_id: number | string;
  item_name: string;
  quantity: number;
  price: number;
  status: 'PENDING' | 'COOKING' | 'READY' | 'SERVED' | 'CANCELLED';
  options?: OrderItemOption[] | string;
  notes?: string;
  created_at?: string;
}

export interface Order {
  id: number | string;
  session_id: number | string;
  order_number: string;
  status: 'PENDING' | 'PREPARING' | 'COMPLETED' | 'CANCELLED';
  total_amount: number;
  items: OrderItem[];
  created_at: string;
}

export interface StaffRequest {
  id: number | string;
  table_id: number | string;
  table_name?: string;
  request_type: 'CALL_STAFF' | 'BILL' | 'OTHER';
  status: 'PENDING' | 'RESOLVED';
  created_at: string;
}
