import { Leaf, Wheat, Shield, Truck, FlaskConical } from "lucide-react";

const badges = [
  { icon: Leaf, label: "100% Natural", color: "text-green-600" },
  { icon: Wheat, label: "Farm Fresh", color: "text-amber-600" },
  { icon: FlaskConical, label: "No Additives", color: "text-red-600" },
  { icon: Shield, label: "Lab Tested", color: "text-blue-600" },
  { icon: Truck, label: "Free Shipping ₹499+", color: "text-purple-600" },
];

export function TrustBadges() {
  return (
    <section className="py-8 md:py-12 bg-amber-50/60 border-y border-amber-100">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-6 md:gap-12">
          {badges.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2">
              <badge.icon className={`w-5 h-5 md:w-6 md:h-6 ${badge.color}`} />
              <span className="text-sm md:text-base font-semibold text-gray-700">
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
