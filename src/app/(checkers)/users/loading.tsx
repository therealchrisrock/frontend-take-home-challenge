
import { Card, CardContent } from "~/components/ui/card";

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`animate-pulse rounded-md bg-gray-200 ${className ?? ""}`}
            {...props}
        />
    );
}

export default function UsersLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header skeleton */}
            <div className="mb-8">
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
            </div>

            {/* Grid layout for users */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center">
                                <Skeleton className="h-16 w-16 rounded-full mb-3" />
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}