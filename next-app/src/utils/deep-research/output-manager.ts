export class OutputManager {
  private buffer: string[] = [];

  log(...args: any[]) {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
    ).join(' ');
    
    this.buffer.push(message);
    console.log(...args);
  }

  getBuffer(): string[] {
    return [...this.buffer];
  }

  clear() {
    this.buffer = [];
  }
}
