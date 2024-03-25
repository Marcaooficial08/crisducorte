import { getServerSession } from "next-auth";
import Header from "../_components/header";


import { redirect } from "next/navigation";
import { db } from "../_lib/prisma";


import BookingItemAdm from "../_components/booking-item-adm";
import { authOptions } from "../_lib/auth";



const BookingsPageAdm  = async() => {
    
    const session = await getServerSession(authOptions)


    if (!session?.user){
    return redirect("/");
    
    }
    const [ confirmeBookings,finishedeBookings ] = await Promise.all([
        db.booking.findMany({
       where: {
        userId:( session.user as any).id,
        date:{
           gte: new Date(),

        }

       },
       include:
       {
        service: true,
        barbershop: true,
        user: true,
        
        
       },
      


      }),
       db.booking.findMany({
         where: {
          userId:( session.user as any).id,
          date:{
             lt: new Date(),
  
          }
  
         },
         include:
         {
          service: true,
          barbershop: true,
          user: true,
          
         },
        
  
  
        }),

      ]);










        
        
      
      //const confirmeBookings = bookings.filter(booking => isFuture(booking.date))
      //const finishedBookings = bookings.filter(booking => isPast(booking.date))
      

     return(
       <>
      <Header/>
         <div className="px-5 py-6">
       <h1 className="text-xl font-bold mb-6">Agendamentos</h1>
      {confirmeBookings.length > 0 && (
         <>

<    h2 className="text-gray-400 uppercase font-bold text-sm  mb-3">Confirmados</h2>
      
      <div className="flex flex-col gap-3">
       {confirmeBookings.map((booking) => (
      <BookingItemAdm key={booking.id} booking={booking}  />
      ))}
       </div>
     
     </>
      )}
  
             
       
       {finishedeBookings.length > 0 && (
         <>
              <h2 className="text-gray-400 uppercase font-bold text-sm mt-6 mb-3">Finalizados</h2>

   <div className="flex flex-col gap-3">
      {finishedeBookings.map((booking) => (
     <BookingItemAdm key={booking.id} booking={booking}  />
     ))}
      </div>

         </>
       )}
    
       </div>
       
       </>
);
};
 
export default BookingsPageAdm ;
