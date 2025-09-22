import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";
import { Separator } from "@/core/components/ui/separator";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  FileText,
  Check,
} from "lucide-react";

export const BookingSummary = React.memo(
  ({ bookingData, profile, selectedServices, totalCost, totalDuration }) => {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Appointment Details */}
        <div className="space-y-6">
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="pb-4 border-b border-border">
                <span className="text-sm font-medium text-muted-foreground">
                  Clinic:
                </span>
                <p className="font-semibold text-foreground text-lg">
                  {bookingData.clinic?.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {bookingData.clinic?.address}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {bookingData.clinic?.phone}
                  </span>
                </div>
              </div>

              <div className="pb-4 border-b border-border">
                <span className="text-sm font-medium text-muted-foreground">
                  Doctor:
                </span>
                <p className="font-semibold text-foreground text-lg">
                  {bookingData.doctor?.name}
                </p>
                <p className="text-sm text-primary font-medium">
                  {bookingData.doctor?.specialization}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Date & Time:
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-foreground">
                    {new Date(bookingData.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-foreground">
                    {bookingData.time} ({totalDuration} minutes)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card className="bg-accent/10 border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Selected Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedServices.map((service) => (
                <div
                  key={service.id}
                  className="flex justify-between items-center p-3 bg-background rounded-lg border"
                >
                  <span className="font-medium">{service.name}</span>
                  <span className="font-semibold text-primary">
                    ₱{service.min_price}-₱{service.max_price}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between items-center pt-3">
                <span className="font-bold text-lg">Estimated Total:</span>
                <span className="font-bold text-2xl text-primary">
                  ₱{totalCost}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Symptoms */}
          {bookingData.symptoms && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Your Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground bg-background p-3 rounded-lg border">
                  {bookingData.symptoms}
                </p>
                <p className="text-xs text-primary mt-2 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  This will be sent to the clinic staff
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Patient Information */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Name:
              </span>
              <p className="font-semibold text-foreground text-lg">
                {profile?.first_name} {profile?.last_name}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Email:
              </span>
              <p className="font-medium text-foreground">{profile?.email}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Phone:
              </span>
              <p className="font-medium text-foreground">
                {profile?.phone || "Not provided"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);

BookingSummary.displayName = "BookingSummary";
