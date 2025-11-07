import React, { useState, useEffect, useRef, useContext } from 'react'
import { assets } from '../assets/assets'
import { NavLink, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext';

const Navbar = () => {
    const navigate = useNavigate();
    const { token, setToken, userData } = useContext(AppContext)
    const [showMenu, setShowMenu] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const dropdownRef = useRef(null)

    const logout = () => {
        setToken(false)
        localStorage.removeItem('token')
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false)
            }
        }

        // Add event listener when dropdown is open
        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        // Cleanup event listener
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showDropdown])

    return (
        <div className='flex items-center justify-between text-sm py-4 mb-5 border-b border-b-gray-400'>
            <img onClick={() => navigate('/')} className='w-44 cursor-pointer' src={assets.logo} alt="" />
            
            {/* Desktop Navigation */}
            <ul className='hidden md:flex items-start gap-5 font-medium'>
                <NavLink to='/' className={({isActive}) => isActive ? 'border-b-2 border-primary' : ''}>
                    <li className='py-1'>HOME</li>
                </NavLink>
                <NavLink to='/doctors' className={({isActive}) => isActive ? 'border-b-2 border-primary' : ''}>
                    <li className='py-1'>All Doctors</li>
                </NavLink>
                <NavLink to='/about' className={({isActive}) => isActive ? 'border-b-2 border-primary' : ''}>
                    <li className='py-1'>ABOUT</li>
                </NavLink>
                <NavLink to='/contact' className={({isActive}) => isActive ? 'border-b-2 border-primary' : ''}>
                    <li className='py-1'>CONTACT</li>
                </NavLink>
            </ul>

            <div className='flex items-center gap-4'>
                {
                    token && userData
                    ? <div ref={dropdownRef} className='flex items-center gap-2 cursor-pointer group relative'>
                        <img className='w-8 rounded-full' src={userData.image} alt="" />
                        <img 
                            className='w-2.5' 
                            src={assets.dropdown_icon} 
                            alt="" 
                            onClick={() => setShowDropdown(!showDropdown)}
                        />
                        <div className={`absolute top-0 right-0 pt-14 text-base font-medium text-gray-600 z-20 ${showDropdown ? 'block' : 'hidden'} md:group-hover:block`}>
                            <div className='min-w-48 bg-stone-100 rounded flex flex-col gap-4 p-4'>
                                <p onClick={() => {navigate('my-profile'); setShowDropdown(false)}} className='hover:text-black cursor-pointer'>My Profile</p>
                                <p onClick={() => {navigate('my-appointments'); setShowDropdown(false)}} className='hover:text-black cursor-pointer'>My Appointments</p>
                                <p onClick={() => {logout(); setShowDropdown(false)}} className='hover:text-black cursor-pointer'>Logout</p>
                            </div>
                        </div>
                    </div>
                    : <button onClick={() => navigate('/login')} className="bg-primary text-white px-8 py-3 rounded-full font-light hidden md:block">Create account</button>
                }
                
                <img onClick={() => setShowMenu(true)} className='w-6 md:hidden' src={assets.menu_icon} alt="" />
                
                {/* Mobile Menu */}
                <div className={`${showMenu ? 'fixed w-full' : 'h-0 w-0'} md:hidden right-0 top-0 bottom-0 z-20 overflow-hidden bg-white transition-all`}>
                    <div className='flex items-center justify-between px-5 py-6'>
                        <img className='w-36' src={assets.logo} alt="" />
                        <img className='w-7' onClick={() => setShowMenu(false)} src={assets.cross_icon} alt="" />
                    </div>
                    
                    <ul className='flex flex-col items-center gap-2 mt-5 px-5 text-lg font-medium'>
                        <NavLink onClick={() => setShowMenu(false)} to='/'><p className='px-4 py-2 rounded inline-block'>Home</p></NavLink>
                        <NavLink onClick={() => setShowMenu(false)} to='/doctors'><p className='px-4 py-2 rounded inline-block'>DOCTORS</p></NavLink>
                        <NavLink onClick={() => setShowMenu(false)} to='/about'><p className='px-4 py-2 rounded inline-block'>ABOUT</p></NavLink>
                        <NavLink onClick={() => setShowMenu(false)} to='/contact'><p className='px-4 py-2 rounded inline-block'>CONTACT</p></NavLink>
                    </ul>

                    {/* Mobile Profile Menu - Added */}
                    {token && (
                        <div className='flex flex-col items-center gap-3 mt-5 px-5 text-lg font-medium border-t pt-5'>
                            <p onClick={() => {navigate('my-profile'); setShowMenu(false)}} className='hover:text-primary cursor-pointer'>My Profile</p>
                            <p onClick={() => {navigate('my-appointments'); setShowMenu(false)}} className='hover:text-primary cursor-pointer'>My Appointments</p>
                            <p onClick={() => {logout(); setShowMenu(false)}} className='hover:text-primary cursor-pointer'>Logout</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Navbar
