export interface Dashboard {
  title: string;
  url: string;
}

export interface Alert {
  id: number;
  panelId: number;
  name: string;
  state: string;
  url: string;
}