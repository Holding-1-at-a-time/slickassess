"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { VehicleInfo } from "@/hooks/useSelfAssessmentForm"

// Generate years for dropdown
const currentYear = new Date().getFullYear()
const years = Array.from({ length: 30 }, (_, i) => currentYear - i)

// Vehicle makes for dropdown
const vehicleMakes = [
  "Acura",
  "Alfa Romeo",
  "Aston Martin",
  "Audi",
  "Bentley",
  "BMW",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Dodge",
  "Ferrari",
  "Fiat",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Jaguar",
  "Jeep",
  "Kia",
  "Lamborghini",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Maserati",
  "Mazda",
  "McLaren",
  "Mercedes-Benz",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Porsche",
  "Ram",
  "Rolls-Royce",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
]

interface StepTwoProps {
  vehicleInfo: VehicleInfo
  updateVehicleInfo: (field: keyof VehicleInfo, value: string) => void
  nextStep: () => void
  prevStep: () => void
}

export function StepTwo({ vehicleInfo, updateVehicleInfo, nextStep, prevStep }: StepTwoProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Vehicle Information</h2>

      <div className="space-y-2">
        <Label htmlFor="make">
          Make <span className="text-red-500">*</span>
        </Label>
        <Select value={vehicleInfo.make} onValueChange={(value) => updateVehicleInfo("make", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select make" />
          </SelectTrigger>
          <SelectContent>
            {vehicleMakes.map((make) => (
              <SelectItem key={make} value={make}>
                {make}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">
          Model <span className="text-red-500">*</span>
        </Label>
        <Input
          id="model"
          value={vehicleInfo.model}
          onChange={(e) => updateVehicleInfo("model", e.target.value)}
          placeholder="Civic, Accord, etc."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="year">
          Year <span className="text-red-500">*</span>
        </Label>
        <Select value={vehicleInfo.year} onValueChange={(value) => updateVehicleInfo("year", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">Color</Label>
        <Input
          id="color"
          value={vehicleInfo.color}
          onChange={(e) => updateVehicleInfo("color", e.target.value)}
          placeholder="Red, Blue, Silver, etc."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="licensePlate">License Plate</Label>
        <Input
          id="licensePlate"
          value={vehicleInfo.licensePlate}
          onChange={(e) => updateVehicleInfo("licensePlate", e.target.value)}
          placeholder="ABC123"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mileage">Mileage</Label>
        <Input
          id="mileage"
          type="number"
          value={vehicleInfo.mileage}
          onChange={(e) => updateVehicleInfo("mileage", e.target.value)}
          placeholder="50000"
        />
      </div>

      <div className="flex justify-between pt-4 gap-4">
        <Button variant="outline" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button onClick={nextStep} className="flex-1">
          Next: Condition
        </Button>
      </div>
    </div>
  )
}
