import { httpClient } from './httpClient';
import type { 
  DataConnector, 
  DataConnectorCreate, 
  DataConnectorUpdate 
} from '../types/api';

class DCService {
  private readonly baseURL = '/api/data-connectors';

  /**
   * Get all data connectors
   */
  async getDataConnectors(): Promise<DataConnector[]> {
    try {
      const response = await httpClient.get<DataConnector[]>(this.baseURL);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch data connectors:', error);
      throw new Error('Failed to fetch data connectors');
    }
  }

  /**
   * Get a specific data connector by ID
   */
  async getDataConnector(id: string): Promise<DataConnector> {
    try {
      const response = await httpClient.get<DataConnector>(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch data connector ${id}:`, error);
      throw new Error(`Failed to fetch data connector ${id}`);
    }
  }

  /**
   * Create a new data connector
   */
  async createDataConnector(data: DataConnectorCreate): Promise<DataConnector> {
    try {
      const response = await httpClient.post<DataConnector>(this.baseURL, data);
      return response.data;
    } catch (error) {
      console.error('Failed to create data connector:', error);
      throw new Error('Failed to create data connector');
    }
  }

  /**
   * Update an existing data connector
   */
  async updateDataConnector(data: DataConnectorUpdate): Promise<DataConnector> {
    try {
      const { id, ...updateData } = data;
      const response = await httpClient.put<DataConnector>(`${this.baseURL}/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Failed to update data connector ${data.id}:`, error);
      throw new Error(`Failed to update data connector ${data.id}`);
    }
  }

  /**
   * Delete a data connector
   */
  async deleteDataConnector(id: string): Promise<void> {
    try {
      await httpClient.delete(`${this.baseURL}/${id}`);
    } catch (error) {
      console.error(`Failed to delete data connector ${id}:`, error);
      throw new Error(`Failed to delete data connector ${id}`);
    }
  }

  /**
   * Test connection for a data connector configuration
   */
  async testConnection(connectorType: string, config: any): Promise<{ status: string; message: string; details?: any }> {
    try {
      const payload = {
        type: connectorType,
        config: config
      };
      
      const response = await httpClient.post<{ status: string; message: string; details?: any }>(
        '/api/data-connectors/test',
        payload
      );
      return response.data;
    } catch (error) {
      console.error('Failed to test connection:', error);
      throw error;
    }
  }

  /**
   * Get connector types with display names
   */
  getConnectorTypeOptions() {
    return [
      { value: '', label: 'None', disabled: false },
      { value: 'postgres', label: 'PostgreSQL', disabled: false },
      { value: 'bigquery', label: 'Google BigQuery', disabled: false },
      { value: 'mysql', label: 'MySQL', disabled: false },
      { value: 'mongodb', label: 'MongoDB', disabled: false },
      { value: 'sqlite', label: 'SQLite', disabled: false },
      { value: 'redis', label: 'Redis', disabled: false },
      { value: 'elasticsearch', label: 'Elasticsearch', disabled: false },
      { value: 'custom', label: 'Custom Connector', disabled: false }
    ];
  }

  /**
   * Format connector type for display
   */
  formatConnectorType(type: string): string {
    const typeMap: Record<string, string> = {
      postgres: 'PostgreSQL',
      bigquery: 'Google BigQuery',
      mysql: 'MySQL',
      mongodb: 'MongoDB',
      sqlite: 'SQLite',
      redis: 'Redis',
      elasticsearch: 'Elasticsearch',
      custom: 'Custom Connector'
    };
    
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }
}

// Export singleton instance
export const dcService = new DCService();
export default dcService;
