export interface RemoteSource {
  id: string;
  name: string;
  baseUrl: string;
}

export interface RemoteMount {
  id: string;
  name: string;
  path: string;
  type: string;
  owner: string;
  host: string;
  public: boolean;
}

export interface RemoteTreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: RemoteTreeNode[];
  size?: number;
  mtime?: number;
}
