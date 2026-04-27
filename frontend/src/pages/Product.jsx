import Navbar from "../components/Navbar";

export default function Product() {
    return (
        <>
            <Navbar />

            <section id="product-text-container">
                <h2>Platform</h2>

                <p>
                    Här kan du skriva information om din plattform,
                    GNSS-tracking, CoAP-enheter och datainsamling.
                </p>
            </section>
        </>
    );
}
