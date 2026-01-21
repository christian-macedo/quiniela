import { ThemeProvider } from "next-themes";
import { Children, useEffect, useState } from "react";

const Providers = ({Children}) => {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <>(Children)</>
    }
    return (
        <ThemeProvider>
            {Children}
        </ThemeProvider>
    );
 };

 export default Providers;