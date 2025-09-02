import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export const useOngoingTreatments = () => {
  const { isPatient, user } = useAuth();
  
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch ongoing treatments
  const fetchOngoingTreatments = useCallback(async () => {
    if (!isPatient()) {
      return { success: false, error: 'Access denied: Patient only' };
    }

    try {
      setLoading(true);
      setError(null);

      // Query appointments with ongoing treatments (multiple appointments for same condition)
      const { data: appointmentData, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          duration_minutes,
          status,
          notes,
          created_at,
          clinic:clinics(id, name, address),
          doctor:doctors(id, first_name, last_name, specialization),
          services:appointment_services(
            service:services(id, name, category, duration_minutes)
          )
        `)
        .eq('patient_id', user?.id)
        .in('status', ['completed', 'confirmed', 'pending'])
        .order('appointment_date', { ascending: true });

      if (error) throw new Error(error.message);

      // Group by treatment type/category to identify ongoing treatments
      const treatmentGroups = {};
      
      appointmentData?.forEach(apt => {
        const services = apt.services?.map(s => s.service) || [];
        services.forEach(service => {
          if (!service?.category) return;
          
          const key = `${service.category}_${apt.doctor.id}`;
          if (!treatmentGroups[key]) {
            treatmentGroups[key] = {
              id: key,
              treatment: service.category,
              doctor: `Dr. ${apt.doctor.first_name} ${apt.doctor.last_name}`,
              clinic: apt.clinic.name,
              clinicAddress: apt.clinic.address,
              appointments: [],
              totalSessions: 0,
              completedSessions: 0,
              nextAppointment: null
            };
          }
          
          treatmentGroups[key].appointments.push({
            ...apt,
            service: service.name
          });
        });
      });

      // Process treatment groups to calculate progress
      const ongoingTreatments = Object.values(treatmentGroups)
        .filter(treatment => treatment.appointments.length > 1) // Multiple appointments indicate ongoing treatment
        .map(treatment => {
          const appointments = treatment.appointments.sort(
            (a, b) => new Date(a.appointment_date) - new Date(b.appointment_date)
          );
          
          const completedCount = appointments.filter(apt => apt.status === 'completed').length;
          const totalCount = appointments.length;
          const progress = Math.round((completedCount / totalCount) * 100);
          
          const nextAppointment = appointments.find(apt => 
            apt.status === 'confirmed' || apt.status === 'pending'
          );

          return {
            ...treatment,
            startDate: appointments[0]?.appointment_date,
            estimatedEndDate: appointments[appointments.length - 1]?.appointment_date,
            progress,
            totalSessions: totalCount,
            completedSessions: completedCount,
            nextAppointment: nextAppointment ? {
              date: nextAppointment.appointment_date,
              time: nextAppointment.appointment_time,
              service: nextAppointment.service,
              duration: `${nextAppointment.duration_minutes} min`,
              cancellable: nextAppointment.status === 'confirmed'
            } : null,
            contactInfo: {
              phone: '+1 (555) 123-4567', // You may need to add this to clinics table
              email: 'contact@clinic.com'
            }
          };
        });

      setTreatments(ongoingTreatments);
      
      return {
        success: true,
        treatments: ongoingTreatments,
        count: ongoingTreatments.length
      };

    } catch (err) {
      const errorMsg = err?.message || 'Failed to load ongoing treatments';
      setError(errorMsg);
      console.error('Fetch ongoing treatments error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isPatient, user]);

  // Auto-fetch on mount
  useEffect(() => {
    if (isPatient() && user) {
      fetchOngoingTreatments();
    }
  }, [isPatient, user, fetchOngoingTreatments]);

  return {
    // Data
    treatments,
    loading,
    error,

    // Actions
    fetchOngoingTreatments,
    refresh: fetchOngoingTreatments,

    // Computed
    hasActiveTreatments: treatments.length > 0,
    activeTreatmentsCount: treatments.length,
    
    // Utilities
    getTreatmentById: (id) => treatments.find(t => t.id === id),
    getTreatmentsByDoctor: (doctorName) => 
      treatments.filter(t => t.doctor.includes(doctorName))
  };
};