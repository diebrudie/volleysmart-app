
import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, ChevronDown, ChevronUp, Search, Filter } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Mock match data
const matchesData = Array.from({ length: 20 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - i * 7); // One match per week
  
  return {
    id: i + 1,
    date: date.toISOString(),
    teamAScore: Math.floor(Math.random() * 3) + 1,
    teamBScore: Math.floor(Math.random() * 3) + 1,
    location: i % 2 === 0 ? "Main Gym" : "Community Center",
    winner: Math.random() > 0.5 ? "Team A" : "Team B",
  };
});

const Matches = () => {
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(
    { key: 'date', direction: 'descending' }
  );
  const [filters, setFilters] = useState({
    location: "all",
    winner: "all",
  });

  // Sort matches
  const sortedMatches = [...matchesData].sort((a, b) => {
    if (!sortConfig) return 0;
    
    if (sortConfig.key === 'date') {
      return sortConfig.direction === 'ascending'
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    
    // For other string fields
    if (a[sortConfig.key as keyof typeof a] < b[sortConfig.key as keyof typeof b]) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (a[sortConfig.key as keyof typeof a] > b[sortConfig.key as keyof typeof b]) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  // Filter matches
  const filteredMatches = sortedMatches.filter(match => {
    // Filter by search term (search in date and location)
    const matchesSearch = 
      new Date(match.date).toLocaleDateString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by location
    const matchesLocation = filters.location === "all" || match.location === filters.location;
    
    // Filter by winner
    const matchesWinner = filters.winner === "all" || match.winner === filters.winner;
    
    return matchesSearch && matchesLocation && matchesWinner;
  });

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName: string) => {
    if (sortConfig?.key !== columnName) {
      return <ChevronDown className="h-4 w-4 ml-1 text-gray-400" />;
    }
    return sortConfig.direction === 'ascending' 
      ? <ChevronUp className="h-4 w-4 ml-1" /> 
      : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get unique locations for filter
  const locations = Array.from(new Set(matchesData.map(match => match.location)));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAuthenticated={true} userRole={user?.role} onLogout={logout} />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Match Days</h1>
          
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  All Match Days
                </CardTitle>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search matches..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Select 
                      value={filters.location} 
                      onValueChange={(value) => setFilters({...filters, location: value})}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {locations.map(location => (
                          <SelectItem key={location} value={location}>{location}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={filters.winner} 
                      onValueChange={(value) => setFilters({...filters, winner: value})}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Winner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Winners</SelectItem>
                        <SelectItem value="Team A">Team A</SelectItem>
                        <SelectItem value="Team B">Team B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">
                        <button 
                          className="flex items-center hover:text-volleyball-primary transition-colors"
                          onClick={() => requestSort('date')}
                        >
                          Date {getSortIcon('date')}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center hover:text-volleyball-primary transition-colors"
                          onClick={() => requestSort('location')}
                        >
                          Location {getSortIcon('location')}
                        </button>
                      </TableHead>
                      <TableHead className="text-center">
                        <span className="flex items-center justify-center">
                          Score
                        </span>
                      </TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center hover:text-volleyball-primary transition-colors"
                          onClick={() => requestSort('winner')}
                        >
                          Winner {getSortIcon('winner')}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No matches found. Try adjusting your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMatches.map((match) => (
                        <TableRow key={match.id}>
                          <TableCell className="font-medium">
                            {formatDate(match.date)}
                          </TableCell>
                          <TableCell>{match.location}</TableCell>
                          <TableCell className="text-center font-semibold">
                            {match.teamAScore} - {match.teamBScore}
                          </TableCell>
                          <TableCell>
                            <span 
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                match.winner === 'Team A' 
                                  ? 'bg-volleyball-primary/10 text-volleyball-primary' 
                                  : 'bg-volleyball-accent/10 text-volleyball-accent'
                              }`}
                            >
                              {match.winner}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/matches/${match.id}`}>
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Matches;
