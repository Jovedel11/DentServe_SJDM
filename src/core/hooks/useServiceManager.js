import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useServiceManager = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isStaff, isAdmin, profile } = useAuth();

  // Get clinic ID for staff users
  const getClinicId = useCallback(() => {
    if (isStaff()) {
      return profile?.role_specific_data?.clinic_id;
    }
    return null;
  }, [isStaff, profile]);

  // Fetch services for clinic
  const fetchServices = useCallback(async (clinicId = null, includeInactive = false) => {
    try {
      setLoading(true);
      setError(null);

      // Use current clinic for staff, allow explicit clinic for admin
      const targetClinicId = clinicId || getClinicId();
      
      let query = supabase
        .from('services')
        .select('*')
        .order('priority', { ascending: false })
        .order('name');

      if (targetClinicId) {
        query = query.eq('clinic_id', targetClinicId);
      }

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      setServices(data || []);

      return {
        success: true,
        services: data || [],
        count: data?.length || 0
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch services';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [getClinicId]);

  // Create new service
  const createService = useCallback(async (serviceData, clinicId = null) => {
    if (!isStaff() && !isAdmin()) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Input validation
      const requiredFields = ['name', 'duration_minutes'];
      const missingFields = requiredFields.filter(field => !serviceData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // ✅ Duration validation
      if (serviceData.duration_minutes < 15 || serviceData.duration_minutes > 480) {
        throw new Error('Duration must be between 15 and 480 minutes');
      }

      // ✅ Price validation
      if (serviceData.min_price && serviceData.max_price && 
          serviceData.min_price > serviceData.max_price) {
        throw new Error('Minimum price cannot be greater than maximum price');
      }

      const targetClinicId = clinicId || getClinicId();
      if (!targetClinicId) {
        throw new Error('Clinic ID is required');
      }

      const { data, error } = await supabase
        .from('services')
        .insert({
          clinic_id: targetClinicId,
          name: serviceData.name,
          description: serviceData.description || null,
          category: serviceData.category || null,
          duration_minutes: serviceData.duration_minutes,
          min_price: serviceData.min_price || null,
          max_price: serviceData.max_price || null,
          priority: serviceData.priority || 10,
          is_active: serviceData.is_active !== false
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // ✅ Update local state
      setServices(prev => [data, ...prev]);

      return {
        success: true,
        service: data,
        message: 'Service created successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to create service';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, getClinicId]);

  // Update service
  const updateService = useCallback(async (serviceId, updates) => {
    if (!isStaff() && !isAdmin()) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Validation for updates
      if (updates.duration_minutes && 
          (updates.duration_minutes < 15 || updates.duration_minutes > 480)) {
        throw new Error('Duration must be between 15 and 480 minutes');
      }

      if (updates.min_price && updates.max_price && 
          updates.min_price > updates.max_price) {
        throw new Error('Minimum price cannot be greater than maximum price');
      }

      const { data, error } = await supabase
        .from('services')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // ✅ Update local state
      setServices(prev => prev.map(service => 
        service.id === serviceId ? data : service
      ));

      return {
        success: true,
        service: data,
        message: 'Service updated successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to update service';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin]);

  // Toggle service status
  const toggleServiceStatus = useCallback(async (serviceId, isActive) => {
    if (!isStaff() && !isAdmin()) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('services')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // ✅ Update local state
      setServices(prev => prev.map(service => 
        service.id === serviceId ? data : service
      ));

      return {
        success: true,
        service: data,
        message: `Service ${isActive ? 'activated' : 'deactivated'} successfully`
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to update service status';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin]);

  // Delete service (admin only)
  const deleteService = useCallback(async (serviceId) => {
    if (!isAdmin()) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Check if service is used in appointments
      const { data: appointmentCheck, error: checkError } = await supabase
        .from('appointment_services')
        .select('id')
        .eq('service_id', serviceId)
        .limit(1);

      if (checkError) throw new Error(checkError.message);

      if (appointmentCheck && appointmentCheck.length > 0) {
        throw new Error('Cannot delete service that has been used in appointments. Deactivate instead.');
      }

      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw new Error(error.message);

      // ✅ Update local state
      setServices(prev => prev.filter(service => service.id !== serviceId));

      return {
        success: true,
        message: 'Service deleted successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to delete service';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Bulk update service priorities
  const updateServicePriorities = useCallback(async (priorityUpdates) => {
    if (!isStaff() && !isAdmin()) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Bulk update using Promise.all
      const updatePromises = priorityUpdates.map(({ serviceId, priority }) =>
        supabase
          .from('services')
          .update({ priority, updated_at: new Date().toISOString() })
          .eq('id', serviceId)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(result => result.error);

      if (errors.length > 0) {
        throw new Error('Failed to update some service priorities');
      }

      // ✅ Refresh services to get updated priorities
      await fetchServices();

      return {
        success: true,
        message: 'Service priorities updated successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to update priorities';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, fetchServices]);

  // Get service statistics
  const getServiceStats = useCallback(() => {
    const activeServices = services.filter(s => s.is_active);
    const inactiveServices = services.filter(s => !s.is_active);
    
    const categories = [...new Set(services.map(s => s.category).filter(Boolean))];
    
    const avgDuration = services.length > 0 
      ? services.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / services.length
      : 0;

    return {
      total: services.length,
      active: activeServices.length,
      inactive: inactiveServices.length,
      categories: categories.length,
      avgDuration: Math.round(avgDuration),
      priceRange: {
        min: Math.min(...services.map(s => s.min_price || 0).filter(p => p > 0)),
        max: Math.max(...services.map(s => s.max_price || 0))
      }
    };
  }, [services]);

  return {
    // State
    services,
    loading,
    error,

    // Actions
    fetchServices,
    createService,
    updateService,
    toggleServiceStatus,
    deleteService,
    updateServicePriorities,

    // Computed
    activeServices: services.filter(s => s.is_active),
    inactiveServices: services.filter(s => !s.is_active),
    serviceCategories: [...new Set(services.map(s => s.category).filter(Boolean))],
    stats: getServiceStats(),

    // Utilities
    clearError: () => setError(null),
    canManageServices: isStaff() || isAdmin(),
    canDeleteServices: isAdmin(),
    clinicId: getClinicId(),

    // Helpers
    getServiceById: (id) => services.find(s => s.id === id),
    getServicesByCategory: (category) => services.filter(s => s.category === category),
    searchServices: (query) => services.filter(s => 
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.description?.toLowerCase().includes(query.toLowerCase())
    )
  };
};
