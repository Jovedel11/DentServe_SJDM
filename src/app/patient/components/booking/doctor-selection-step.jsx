import React from "react";
import { Stethoscope, User, Calendar, Star, CreditCard } from "lucide-react";
import SelectionCard from "@/core/components/ui/selection-card";

const DoctorSelectionStep = ({ doctors, selectedDoctor, onDoctorSelect }) => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Stethoscope className="w-6 h-6 text-primary" />
        <h2 className="text-3xl font-bold text-foreground">
          Choose Your Doctor
        </h2>
      </div>

      {doctors.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {doctors.map((doctor) => (
            <SelectionCard
              key={doctor.id}
              isSelected={selectedDoctor?.id === doctor.id}
              onClick={() => onDoctorSelect(doctor)}
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {doctor.name}
                    </h3>
                  </div>

                  <p className="text-primary font-semibold mb-3">
                    {doctor.specialization}
                  </p>

                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {doctor.experience_years} years experience
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-muted-foreground">
                        Rating: {doctor.rating || "N/A"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        Consultation: ₱{doctor.consultation_fee}
                      </span>
                    </div>
                  </div>

                  {doctor.education && (
                    <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        🎓 {doctor.education}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </SelectionCard>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Stethoscope className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No doctors available
          </h3>
          <p className="text-muted-foreground">
            Please select a different clinic or try again later.
          </p>
        </div>
      )}
    </div>
  );
};

export default DoctorSelectionStep;
