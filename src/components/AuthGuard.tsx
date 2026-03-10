"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (pathname === "/login") {
            setAuthorized(true);
            return;
        }

        const auth = localStorage.getItem("is_authenticated");
        if (auth !== "true") {
            setAuthorized(false);
            router.push("/login");
        } 
        else {
            setAuthorized(true);
        }
    }, [pathname, router]);

    if (!authorized && pathname !== "/login") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a0e1a]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
