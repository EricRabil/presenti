export interface NotificationCenter {
    /** Post a notification to all observers */
    post(name: string, object: any): Promise<void>;
    /** Observe a specific notification */
    addObserver(forName: string, handler: (object: any) => any): Promise<void>;
    /** Unobserve a specific notification */
    removeObserver(forName: string, handler: (object: any) => any): void;
}