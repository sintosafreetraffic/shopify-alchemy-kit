import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReviewSortOption } from "@/hooks/useProductReviews";

interface ReviewSortDropdownProps {
  value: ReviewSortOption;
  onChange: (value: ReviewSortOption) => void;
}

const sortOptions: { value: ReviewSortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "highest", label: "Highest Rated" },
  { value: "lowest", label: "Lowest Rated" },
  { value: "helpful", label: "Most Helpful" },
];

export const ReviewSortDropdown = ({ value, onChange }: ReviewSortDropdownProps) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
