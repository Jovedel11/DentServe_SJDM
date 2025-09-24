import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useUIComponentsManager = () => {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { isAdmin } = useAuth();

  const manageComponents = useCallback(async (action, componentData = null, componentId = null) => {
    // ✅ Admin-only access
    if (!isAdmin) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Action validation
      const validActions = ['list', 'create', 'update', 'delete', 'toggle_status'];
      if (!validActions.includes(action)) {
        throw new Error(`Invalid action: ${action}`);
      }

      const { data, error: rpcError } = await supabase.rpc('manage_ui_components', {
        p_action: action,
        p_component_data: componentData,
        p_component_id: componentId
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // ✅ Handle function response structure
      if (!data.success) {
        throw new Error(data.error || `Failed to ${action} UI component`);
      }

      // ✅ Update local state based on action
      if (action === 'list') {
        setComponents(data.data.components || []);
      } else if (action === 'create') {
        setComponents(prev => [...prev, data.data]);
      } else if (action === 'update' || action === 'toggle_status') {
        setComponents(prev => prev.map(comp => 
          comp.id === componentId ? { ...comp, ...data.data } : comp
        ));
      } else if (action === 'delete') {
        setComponents(prev => prev.filter(comp => comp.id !== componentId));
      }

      return {
        success: true,
        data: data.data,
        message: data.message
      };

    } catch (err) {
      const errorMessage = err.message || `Failed to ${action} UI component`;
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // ✅ Specific action methods
  const listComponents = useCallback(() => {
    return manageComponents('list');
  }, [manageComponents]);

  const createComponent = useCallback((componentData) => {
    // ✅ Input validation
    const requiredFields = ['component_name', 'component_type'];
    const missingFields = requiredFields.filter(field => !componentData[field]);
    
    if (missingFields.length > 0) {
      setError(`Missing required fields: ${missingFields.join(', ')}`);
      return { success: false, error: `Missing required fields: ${missingFields.join(', ')}` };
    }

    return manageComponents('create', componentData);
  }, [manageComponents]);

  const updateComponent = useCallback((componentId, componentData) => {
    if (!componentId) {
      setError('Component ID is required for update');
      return { success: false, error: 'Component ID is required for update' };
    }

    return manageComponents('update', componentData, componentId);
  }, [manageComponents]);

  const deleteComponent = useCallback((componentId) => {
    if (!componentId) {
      setError('Component ID is required for deletion');
      return { success: false, error: 'Component ID is required for deletion' };
    }

    return manageComponents('delete', null, componentId);
  }, [manageComponents]);

  const toggleComponentStatus = useCallback((componentId) => {
    if (!componentId) {
      setError('Component ID is required to toggle status');
      return { success: false, error: 'Component ID is required to toggle status' };
    }

    return manageComponents('toggle_status', null, componentId);
  }, [manageComponents]);

  return {
    // State
    components,
    loading,
    error,
    
    // Derived state
    activeComponents: components.filter(comp => comp.is_active),
    inactiveComponents: components.filter(comp => !comp.is_active),
    componentsByType: components.reduce((acc, comp) => {
      const type = comp.component_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(comp);
      return acc;
    }, {}),
    
    // Actions
    listComponents,
    createComponent,
    updateComponent,
    deleteComponent,
    toggleComponentStatus
  };
};